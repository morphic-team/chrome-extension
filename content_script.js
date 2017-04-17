var linkRegex = /.*?imgres\?imgurl=(.*?)&imgrefurl/;
var visibleLinkRegex = /.*?imgrefurl=(.*?)&/;
var morphicId = /morphic_id:(\d+)/.exec(window.location.href)[1];

var RESULTS_TO_SCRAPE = 400;
var MAX_RETRIES = 5;
var parsedResults = new Array();
var resultsContainer = document.querySelector('#rg_s');

function parseResultLink(link) {
  var href = link.getAttribute('href');
  return {
    image_link: unescape(unescape(href.match(linkRegex)[1])),
    visible_link: unescape(unescape(href.match(visibleLinkRegex)[1])),
  }
}

function canParseLink(link) {
  return link !== null && link.getAttribute('href').match(linkRegex);
}

function scrapeResults(retries = 0) {
  if (parsedResults.length >= RESULTS_TO_SCRAPE) {
    chrome.extension.sendRequest({
      method: 'sendResults',
      id: morphicId,
      args: {
        results: parsedResults,
      },
    })
    chrome.extension.sendRequest({
      method: 'done',
      id: morphicId,
      args: {
        resultsCount: parsedResults.length,
      },
    });
    window.close();
    return;
  }

  if (retries > MAX_RETRIES) {
    chrome.extension.sendRequest({
      method: 'failure',
      id: morphicId,
      args: {
        results: parsedResults,
        resultsCount: parsedResults.length,
        resultsToScrape: RESULTS_TO_SCRAPE,
      },
    });
    window.close();
    return;
  }

  var i = parsedResults.length;
  var seeMoreButton = document.querySelector('#smb')
  console.log(`Attempting to scrape result number ${i}, retry number ${retries}`);
  var resultLink = resultsContainer.querySelector(`div.rg_di[data-ri="${i}"]>a[href]`);
  if (canParseLink(resultLink)) {
    console.log(`Got result number ${i}`);
    resultLink.scrollIntoView();
    parsedResults.push(parseResultLink(resultLink));
    chrome.extension.sendRequest({
      method: 'progress',
      id: morphicId,
      args: {
        resultsToScrape: RESULTS_TO_SCRAPE,
        resultsCount: parsedResults.length,
      },
    })
    setTimeout(scrapeResults, 0, 0);
  } else if (seeMoreButton !== null) {
    console.log(`Found see more button, clicking then sleeping.`);
    seeMoreButton.click();
    setTimeout(scrapeResults, 1000, retries + 1);
  } else {
    console.log(`Didn't get result number ${i}, sleeping.`);
    setTimeout(scrapeResults, 1000, retries + 1);
  }
}

scrapeResults();
chrome.extension.sendRequest({
  method: 'started',
  id: morphicId,
})
