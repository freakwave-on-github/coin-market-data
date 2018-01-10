/**
 * 
 * Author: Alexander Krüger
 * 
 * Date: 28.12.2017
 * 
 * Description: Tiny script to grab chat items from a web site using chrome
 * headless with puppeteer for rendering the chat web site and to extract data;
 * elasticsearch to persist collected data.
 * 
 * Version 0.1
 */



// CONFIGURATION
const CONFIG = [
  {
    'name' : 'liquichat',
    'url' : 'https://liqui.io/',
    'selector' : 'p.message-text',
    'requireReload' : false
  },
  {
    'name' : 'tradingviewchat',
    'url' : 'https://www.tradingview.com/chatwidgetembed/?locale=en#bitcoin',
    'selector' : 'div.ch-item-text',
    'requireReload' : false
  },
  {
    'name' : 'wexnzchat',
    'url' : 'https://wex.nz',
    'selector' : 'p.chatmessage',
    'requireReload' : true
  }
];
const LIQUI_CHAT        = CONFIG[0];
const TRADINGVIEW_CHAT  = CONFIG[1];
const WEXNZ_CHAT  		= CONFIG[2];






var CHAT = TRADINGVIEW_CHAT;

process.argv.forEach(function (val, index, array) {
  console.log(index, val, array);
  const USAGE = 'Usage "node grabchat.js LIQUI|TRADINGVIEW|WEXNZ"';
  if (array.length === 3){
    if (array[2] ==='LIQUI'){
      CHAT = LIQUI_CHAT;
    }else if (array[2] ==='TRADINGVIEW'){
        CHAT = TRADINGVIEW_CHAT;
    }else if (array[2] ==='WEXNZ'){
        CHAT = WEXNZ_CHAT;
    }else{
      console.log(USAGE);
      process.exit(1);
    }
  }else{
    console.log(USAGE);
    process.exit(1);
  }

});


// elastic defs
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'localhost:9200',
// log: 'trace'
  log: 'info'
});


// CHATGRABBER
const puppeteer = require('puppeteer');

var listChat = [];
var run = true;

async function addLatestChatItems(page, chat){
  // grab latest chat item
  var latestChatItem = (await page.evaluate((sel) => {
    var elements = document.querySelectorAll(sel);
    var elem = undefined;
    if (elements !== null && elements !== undefined){
      elem = elements[elements.length-1];
    }
    //only grab if not already extracted, cleanup html-tags and additional spaces
    return elem === undefined ? undefined : elem.innerHTML.replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim();
  }, chat.selector));

  if (run && latestChatItem !== undefined){
    if (listChat.length === 0 || listChat[listChat.length - 1] !== latestChatItem){
        console.log(latestChatItem);
        listChat.push(latestChatItem);
        
        await client.index({
          index: 'chat',
          type: chat.name,
          id: (new Date()).getTime(),
          body: {
            text: latestChatItem,
            date: new Date()
          }
        }, function (error, response) {
          // console.log(error,response);
        });
    }
  }
  return 0;
}


(async () => {
  
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto(CHAT.url);

  while (run){
    
    // check for new chat item
    await addLatestChatItems(page, CHAT)
    .catch(e => {
      console.log(e);
    })
    .then(r => {
    });
    await page.waitFor(50);
    if (CHAT.requireReload === true){
  	  await page.goto(CHAT.url);
    }
    // process.stdout.write('.');
  }
  await browser.close();

})();
