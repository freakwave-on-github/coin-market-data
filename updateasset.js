/**
 * 
 * Author: Alexander Krüger
 * 
 * Date: 29.12.2017
 * 
 * Description: Tiny script to load assets from coinmarketcap (cmc) and grabbing additional data from the coin's website of cmc
 * chrome headless with puppeteer for rendering the coin's cmc web site and to extract data;
 * elasticsearch to persist collected data.
 * 
 * Version 0.1
 */

// elastic defs
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'localhost:9200',
// log: 'trace'
  log: 'info'
});


async function updateAsset(asset, coinmarketWebData){
    await client.index({
         index: 'asset',
         type: 'coinmarketcap',
         id: asset.id,
         body: {
            'name': asset.name,
            'symbol': asset.symbol,
            'rank': asset.rank,
            'price_usd': asset.price_usd,
            'price_btc': asset.price_btc,
            '24h_volume_usd': asset['24h_volume_usd'],
            'market_cap_usd': asset.market_cap_usd,
            'available_supply': asset.available_supply,
            'total_supply': asset.total_supply,
            'max_supply': asset.max_supply,
            'percent_change_1h': asset.percent_change_1h,
            'percent_change_24h': asset.percent_change_24h,
            'percent_change_7d': asset.percent_change_7d,
            'last_updated': asset.last_updated,
            'website' : coinmarketWebData.website,
            'announecement' : coinmarketWebData.announecement,
            'explorer' : coinmarketWebData.explorer,
            'chat' : coinmarketWebData.chat,
            'source' : coinmarketWebData.source
         }
        }, function (error, response) {
            //console.log(error,response);
        });
}


async function getTicker(){
    const CoinMarketCap = require('coinmarketcap-api');
    const clientCoinMarketCap = new CoinMarketCap();
    var ticker = clientCoinMarketCap.getTicker({limit: 10000}).then(function(ticker){
        return ticker;
    }).catch(console.error);
    return ticker;
}

async function getCoinmarketWebData(cmcCoinId, page){
      var url = 'https://coinmarketcap.com/currencies/' + cmcCoinId + '/';
      //console.log('opening ' + url);
      await page.goto(url);
      const navListLength = await page.evaluate(() => document.querySelectorAll('body > div.container > div > div.col-lg-10 > div.row.bottom-margin-2x > div.col-sm-4.col-sm-pull-8 > ul > li').length);
  
      var coinWebData = {
        website : '',
        announcement : '',
        explorer : '',
        chat : '',
        source :''
      };

      for (var i = 1; i <= navListLength ; i++ ){
        var selector = 'body > div.container > div > div.col-lg-10 > div.row.bottom-margin-2x > div.col-sm-4.col-sm-pull-8 > ul > li:nth-child('+i+')';
        var data = (await page.evaluate((sel) => {
              var elements = document.querySelectorAll(sel);
              var elem = undefined;
              if (elements !== null && elements !== undefined){
                elem = elements[0];
            }
              return elem === undefined ? undefined : elem.innerHTML;
            }, selector));
          
          if (data.split('href=\"')[1] !== undefined){
            var link = data.split('href=\"')[1].split('\"')[0];
            if (data.endsWith('Website</a>')){
              coinWebData.website = link;
            } else if (data.endsWith('Announcement</a>')){
              coinWebData.announcement = link;
            } else if (data.endsWith('Explorer</a>')){
              coinWebData.explorer = link;
            } else if (data.endsWith('Chat</a>')){
              coinWebData.chat = link;
            } else if (data.endsWith('Source Code</a>')){
                coinWebData.source = link;
            }

          }
  
      }
      return coinWebData;
  };

const puppeteer = require('puppeteer');
(async () => {
    const ticker = await getTicker();
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    console.log('Start updateing ' + ticker.length + ' assets. ' + new Date());
    for (var i = 0; i < ticker.length; i++){
    	var logInfo = '#'+ (i+1) + ' ID:' + asset.id + ' ' + new Date();
        var asset = ticker[i];
        try{
            var coinWebData = await getCoinmarketWebData(asset.id, page);
            await updateAsset(asset, coinWebData);
            //progress
            console.log(logInfo);
        }catch(e){
            console.log(logInfo + '==> ' + e);
        }
    }
    await browser.close();
})();