var LINK_REGEX = /.*?imgres\?imgurl=(.*?)&imgrefurl/;
var VISIBLE_LINK_REGEX = /.*?imgrefurl=(.*?)&/;
var morphicId = /morphic_id:(\d+)/.exec(window.location.href)[1];

var RESULTS_TO_SCRAPE = 400;
var MAX_RETRIES = 5;
var parsedResults = new Array();

var resultsContainer = document.querySelector('.islrc');


var i = 1

function parseResultLink(link) {
  var href = link.getAttribute('href');
  return {
    image_link: unescape(unescape(href.match(LINK_REGEX)[1])),
    visible_link: unescape(unescape(href.match(VISIBLE_LINK_REGEX)[1])),
  }
}

function canParseLink(link) {
  if (link == null) {
    return false;
  }

  href = link.getAttribute('href');

  if (href == null) {
    return false;
  }

  return href.match(LINK_REGEX);
}

function canClickLink(link) {
  if (link == null) {
    return false;
  }
  link.scrollIntoView();
  link.click();
  return true;
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

  var seeMoreButton = document.querySelector('input.mye4qd')
  console.log(`Attempting to scrape result number ${i}, retry number ${retries}`);

  var resultContainer = resultsContainer.querySelector(`div.isv-r[data-ri="${i}"]`);

  if (resultContainer == null) {
    if (seeMoreButton !== null) {
      console.log(`Found see more button, clicking then sleeping.`);
      seeMoreButton.click();
      setTimeout(scrapeResults, 1000, retries + 1);
    }

    console.log(`Didn't get result container number ${i}, sleeping.`);
    setTimeout(scrapeResults, 1000, retries + 1);
  }

  var resultLink = resultContainer.querySelector('a');

  if (!resultLink.matches('.islib')) {
    i += 1;
    console.log(`Got invalid result link number ${i}, skipping`);
    setTimeout(scrapeResults, 0, 0);
    return;
  }

  if (canClickLink(resultLink) && canParseLink(resultLink)) {
    console.log(`Got result number ${i}`);
    resultLink.scrollIntoView();
    i += 1;
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
