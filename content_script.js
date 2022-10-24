const RESULTS_TO_SCRAPE = 400;
const RETRY_TIMEOUT = 250;
const MAX_RETRIES = 20;

const LINK_REGEX = /.*?imgres\?imgurl=(.*?)&imgrefurl/;
const VISIBLE_LINK_REGEX = /.*?imgrefurl=(.*?)&/;
const MORPHIC_ID_REGEX = /morphic_id:(\d+)/;

const RESULT_CONTAINER_SELECTOR = '.islrc';
const SEE_MORE_BUTTON_SELECTOR = 'input.mye4qd';
const RESULT_SELECTOR_TEMPLATE = 'div.isv-r[data-ri="resultIndex"]';
const SEARCH_RESULT_LINK_SELECTOR = '.islib'


function doubleDecodeUri(uri) {
  return document.decodeURI(document.decodeURI(uri))
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

// https://lihautan.com/retry-async-function-with-callback-promise/
function retry(fn, n, callback) {
  let attempt = 0;

  function _retry() {
    fn((error, data) => {
      if (!error) {
        callback(null, data);
      } else {
        attempt++;
        if (attempt > n) {
          cb(new Error(f`Failed after retrying ${n} times.`));
        } else {
          _retry();
        }
      }
    });
  }

  _retry();
};

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


function scrapeResult(cursor, callback) {
  console.log(`Attempting to scrape result ${cursor}`);

  const resultsContainer = document.querySelector(RESULT_CONTAINER_SELECTOR);

  if (resultsContainer == null) {
    callback(new Error('Results container is null'));
  }

  const resultSelector = RESULT_SELECTOR_TEMPLATE.replace('resultIndex', cursor);
  const resultContainer = resultsContainer.querySelector(resultSelector);

  if (resultContainer == null) {
    const seeMoreButton = document.querySelector(SEE_MORE_BUTTON_SELECTOR);

    if (seeMoreButton !== null) {
      console.log('Clicking see more button.');
      seeMoreButton.click();
    }

    callback(new Error(`Result container ${cursor} is null`))
    return
  }

  const resultLink = resultContainer.querySelector('a');

  if (resultLink == null) {
    callback(new Error(`Result link ${cursor} is null`));
    return
  }

  // Check if the result link is a normal image search result.
  if (!resultLink.matches(SEARCH_RESULT_SELECTOR)) {
    // Skip
    callback(null, { cursor: cursor + 1 });
    return
  }


  resultLink.scrollIntoView();
  resultLink.click();

  // click link if not null
  if (canParseLink(resultLink)) {
    console.log(`Got search result ${cursor}`);
    resultLink.scrollIntoView();
    const scrapedResult = parseResultLink(resultLink);
    callback(null, { scrapedResult, cursor: cursor + 1});
    return
  } else {
    callback(new Error(`Unable to parse ${cursor}`));
    return
  }
};

function scrapeResults() {
  const morphicId = MORPHIC_ID_REGEX.exec(window.location.href)[1];

  const scrapedResults = new Array();

  sendStart();

  let cursor = 0;

  function _scrapeResult(callback) {
    scrapeResult(cursor, (error, data) => {
      callback(error, data);
    })
  }

  retry(_scrapeResult, MAX_RETRIES, (error, data) => {
    if (error != null) {
      sendFailure(scrapedResults.length, RESULTS_TO_SCRAPE);
      window.close();
    }

    if (data.scrapedResult != null) {
      scrapedResults.push(data.scrapedResult);
      sendProgress(morphicId, scrapedResults.length, RESULTS_TO_SCRAPE);
    }

    cursor = data.cursor;
  });

  sendResults(scrapedResults);
  sendDone(scrapedResults.length);
}

scrapeResults();
