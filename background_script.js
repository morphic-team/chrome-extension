var endpoint = 'https://morphs.io/api/upload-google-results';

function getOptions(id, message, progress, buttons) {
  var buttons = typeof buttons !== 'undefined' ? buttons : null;
  var progress = typeof progress !== 'undefined' ?  progress : 0;
  return {
    type: 'progress',
    title: `Morphic search ${id}.`,
    iconUrl: './green-icon.png',
    message: message,
    progress: progress,
    priority: 2,
    buttons: buttons,
  }
}

function getProgress(a, b) {
  return Math.round((a / b) * 100);
}

function sendResults(id, results) {
  console.log(results);
  $.ajax({
    type: 'POST',
    url: endpoint,
    data: JSON.stringify({
      morphic_id: id,
      results: JSON.stringify(results),
    }),
    contentType: "application/json; charset=utf-8",
    dataType: "json"
  });
}

var handler = {
  started: function(id) {
    chrome.notifications.create(id, getOptions(
      id,
      'Started scraping results.'
    ));
  },
  progress: function(id, args) {
    chrome.notifications.update(id, getOptions(
      id,
      `Scraping results (${args.resultsCount} / ${args.resultsToScrape}).`,
      getProgress(args.resultsCount, args.resultsToScrape)
    ));
  },
  done: function(id, args) {
    chrome.notifications.update(id, getOptions(
      id,
      `Done scraping results, got ${args.resultsCount}.`,
      getProgress(1, 1)
    ));
  },
  failure: function(id, args) {
    chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex) {
      if (notificationId === id) {
        switch (buttonIndex) {
          case 0:
            sendResults(id, args.results)
            chrome.notifications.update(id, getOptions(
              id,
              `Done scraping results, got ${args.resultsCount}.`,
              getProgress(args.resultsCount, args.resultsToScrape),
              []
            ));
            break;
          case 1:
            chrome.notifications.clear(id);
        }
      }
    });

    chrome.notifications.update(id, getOptions(
      id,
      `Failed after scraping ${args.resultsCount} of ${args.resultsToScrape} results.`,
      getProgress(args.resultsCount, args.resultsToScrape),
      [
        {
          title: `Accept partial results`,
        },
        {
          title: 'Reject partial results',
        },
      ]
    ))
  },
  sendResults: function(id, args) {
    sendResults(id, args.results);
  }
}

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  if (handler[request.method] !== null) {
    handler[request.method](request.id, request.args);
  }
})
