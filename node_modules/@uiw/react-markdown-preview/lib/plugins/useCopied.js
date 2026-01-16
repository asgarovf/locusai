"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault")["default"];
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useCopied = useCopied;
var _copyToClipboard = _interopRequireDefault(require("@uiw/copy-to-clipboard"));
var _react = require("react");
function getParentElement(target) {
  if (!target) return null;
  var dom = target;
  if (dom.dataset.code && dom.classList.contains('copied')) {
    return dom;
  }
  if (dom.parentElement) {
    return getParentElement(dom.parentElement);
  }
  return null;
}
function useCopied(container) {
  var handle = function handle(event) {
    var target = getParentElement(event.target);
    if (!target) return;
    target.classList.add('active');
    (0, _copyToClipboard["default"])(target.dataset.code, function () {
      setTimeout(function () {
        target.classList.remove('active');
      }, 2000);
    });
  };
  (0, _react.useEffect)(function () {
    var _container$current, _container$current2;
    (_container$current = container.current) === null || _container$current === void 0 || _container$current.removeEventListener('click', handle, false);
    (_container$current2 = container.current) === null || _container$current2 === void 0 || _container$current2.addEventListener('click', handle, false);
    return function () {
      var _container$current3;
      (_container$current3 = container.current) === null || _container$current3 === void 0 || _container$current3.removeEventListener('click', handle, false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container]);
}