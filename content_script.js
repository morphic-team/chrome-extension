

function parseResultLink(link) {
  var href = link.getAttribute('href');
  return {
    image_link: doubleDecodeUri(href.match(LINK_REGEX)[1]),
    visible_link: document.decodeURI(href.match(VISIBLE_LINK_REGEX)[1]),
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

const RESULTS_TO_SCRAPE = 400;
const RETRY_TIMEOUT = 250;
const MAX_RETRIES = 20;

const LINK_REGEX = /.*?imgres\?imgurl=(.*?)&imgrefurl/;
const VISIBLE_LINK_REGEX = /.*?imgrefurl=(.*?)&/;
const MORPHIC_ID_REGEX = /morphic_id:(\d+)/;

const RESULT_CONTAINER_SELECTOR = '.islrc';
const SEE_MORE_BUTTON_SELECTOR = 'input.mye4qd';
const RESULT_SELECTOR_TEMPLATE = 'div.isv-r[data-ri="resultIndex"]';


function doubleDecodeUri(uri) {
  return document.decodeURI(document.decodeURI(uri))
}

if (!resultLink.matches('.islib')) {
  i += 1;
  console.log(`Got invalid result link number ${i}, skipping`);
  setTimeout(scrapeResults, 0, 0);
  return;
}

// click link if not null
if (canClickLink(resultLink) && canParseLink(resultLink)) {
  console.log(`Got result number ${i}`);
  resultLink.scrollIntoView();
  i += 1;
  parsedResults.push(parseResultLink(resultLink));
  setTimeout(scrapeResults, 0, 0);
} else {
  console.log(`Didn't get result number ${i}, sleeping.`);
  setTimeout(scrapeResults, 1000, retries + 1);
}

function sendStart(id) {
  chrome.extension.sendRequest({
    method: 'started',
    id,
  })
}

function sendProgress(id, resultsCount, resultsToScrape) {
  chrome.extension.sendRequest({
    method: 'progress',
    id,
    args: {
      resultsCount,
      resultsToScrape,
    },
  })
}

function sendResults(id, results) {
  chrome.extension.sendRequest({
    method: 'results',
    id,
    args: { results, },
  })
}

function sendDone(id, resultsCount) {
  chrome.extension.sendRequest({
    method: 'done',
    id,
    args: { resultsCount, },
  });
}

function sendFailure(resultsCount, resultsToScrape) {
  chrome.extension.sendRequest({
    method: 'failure',
    id,
    args: {
      resultsCount,
      resultsToScrape,
    },
  });
}

function tryScrapeResult(resultIndex);

function scrapeResult(resultIndex, onSuccess, onFailure, retryCounter = 0) {
  return new Promise((resolve, reject) => {
    if (retryCounter > MAX_RETRIES) {
      return reject();
    }

    const resultSelector = RESULT_SELECTOR_TEMPLATE.replace('resultIndex', resultIndex);
    const resultContainer = resultsContainer.querySelector(resultSelector);

    console.log(`Attempting to scrape result ${resultIndex}, retry number ${retryCounter}`);

    if (resultContainer == null) {
      const seeMoreButton = document.querySelector(SEE_MORE_BUTTON_SELECTOR);

      if (seeMoreButton !== null) {
        console.log('Clicking see more button.');
        seeMoreButton.click();
      }

      console.log(`Scheduling retry`);
      setTimeout(scrapeResult, RETRY_TIMEOUT, retryCounter + 1);
      return
    }

    const resultLink = resultContainer.querySelector('a');

    // Check if the result link is a normal image search result.
    if (!resultLink.matches('.islib')) {
      console.log(`Got invalid result link number ${i}, skipping`);
      setTimeout(scrapeResults, 0, 0);
      return;
    }
  })
}

function scrapeResults() {
  const scrapedResults = new Array();

  const resultsContainer = document.querySelector(RESULT_CONTAINER_SELECTOR);

  let resultIndex = 0;

  scrapeResult(resultsContainer, resultIndex);

  return scrapedResults;
}


function main() {
  const morphicId = MORPHIC_ID_REGEX.exec(window.location.href)[1];

  const scrapedResults = scrapeResults();

  sendStart();
  sendResults(scrapedResults);
  sendDone(scrapedResults.length);
  window.close();
}

scrapeResults();
