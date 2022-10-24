var ENDPOINT_URL = 'https://morphs.io/api/upload-google-results';
// var ENDPOINT_URL = 'http://localhost:5000/upload-google-results';


function getNotificationOptions(id, message, progress) {
  var progress = typeof progress !== 'undefined' ? progress : 0;
  return {
    type: 'progress',
    title: `Morphic search ${id}.`,
    iconUrl: './green-icon.png',
    message: message,
    progress: progress,
    priority: 2,
  }
}

function getProgressPercentage(a, b) {
  return Math.round((a / b) * 100);
}

function sendResults(id, results) {
  fetch(ENDPOINT_URL, {
    method: 'POST',
    body: JSON.stringify({
      morphic_id: id,
      results: JSON.stringify(results),
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

var handler = {
  started: (id) => {
    chrome.notifications.create(id, getNotificationOptions(
      id,
      'Started scraping results.'
    ));
  },
  progress: (id, args) => {
    chrome.notifications.update(id, getNotificationOptions(
      id,
      `Scraping results (${args.resultsCount} / ${args.resultsToScrape}).`,
      getProgressPercentage(args.resultsCount, args.resultsToScrape),
    ));
  },
  done: (id, args) => {
    chrome.notifications.update(id, getNotificationOptions(
      id,
      `Done scraping results, got ${args.resultsCount}.`,
      getProgressPercentage(1, 1),
    ));
  },
  results: (id, args) => {
    sendResults(id, args.results);
  },
  failure: (id, args) => {
    chrome.notifications.update(id, getNotificationOptions(
      id,
      `Failed after scraping ${args.resultsCount} of ${args.resultsToScrape} results.`,
      getProgressPercentage(args.resultsCount, args.resultsToScrape),
    ))
  },
}

chrome.extension.onRequest.addListener((request) => {
  if (handler[request.method] !== null) {
    handler[request.method](request.id, request.args);
  }
})
