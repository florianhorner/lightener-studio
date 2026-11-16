// The sidebar editor shows suggested shapes on the first open of an untouched
// group until this user answers them in this browser, or else a tip once.
// Fixtures that test other behaviour load this first so every group counts as
// answered; a test opts back in with ?firstOpen=1.
if (new URLSearchParams(location.search).get('firstOpen') !== '1') {
  const getItem = Storage.prototype.getItem;
  Storage.prototype.getItem = function (key) {
    const value = getItem.call(this, key);
    if (
      value === null &&
      this === window.localStorage &&
      String(key).startsWith('lightener:first-use:v1:')
    )
      return 'seen';
    return value;
  };
}
