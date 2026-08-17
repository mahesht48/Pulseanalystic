(function () {
  var script = document.currentScript ||
    document.querySelector('script[data-key]');

  if (!script) return;

  var apiKey   = script.getAttribute('data-key');
  var endpoint = script.getAttribute('data-endpoint') || '/api/analytics/collect';

  if (!apiKey) return;

  function device() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      ? 'mobile'
      : 'desktop';
  }

  function send() {
    var payload = JSON.stringify({
      event:    'pageview',
      url:      location.href,
      referrer: document.referrer || '',
      device:   device(),
      metadata: { userAgent: navigator.userAgent }
    });

    // fetch with keepalive so the request survives page transitions
    if (typeof fetch === 'function') {
      fetch(endpoint, {
        method:    'POST',
        headers:   { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
        body:      payload,
        keepalive: true
      }).catch(function () {});
      return;
    }

    // XMLHttpRequest fallback for older browsers
    var xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-API-KEY', apiKey);
    xhr.send(payload);
  }

  // Initial pageview
  send();

  // SPA: intercept pushState so navigation triggers a new pageview
  var _push = history.pushState.bind(history);
  history.pushState = function () {
    _push.apply(history, arguments);
    send();
  };

  // SPA: handle browser back/forward
  window.addEventListener('popstate', send);
}());
