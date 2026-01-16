"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard")["default"];
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _react = _interopRequireWildcard(require("react"));
var _jsxRuntime = require("react/jsx-runtime");
var DragBar = function DragBar(props) {
  var _ref = props || {},
    prefixCls = _ref.prefixCls,
    onChange = _ref.onChange;
  var $dom = (0, _react.useRef)(null);
  var dragRef = (0, _react.useRef)();
  var heightRef = (0, _react.useRef)(props.height);
  (0, _react.useEffect)(function () {
    if (heightRef.current !== props.height) {
      heightRef.current = props.height;
    }
  }, [props.height]);
  function handleMouseMove(event) {
    if (dragRef.current) {
      var _changedTouches$;
      var clientY = event.clientY || ((_changedTouches$ = event.changedTouches[0]) === null || _changedTouches$ === void 0 ? void 0 : _changedTouches$.clientY);
      var newHeight = dragRef.current.height + clientY - dragRef.current.dragY;
      if (newHeight >= props.minHeight && newHeight <= props.maxHeight) {
        onChange && onChange(dragRef.current.height + (clientY - dragRef.current.dragY));
      }
    }
  }
  function handleMouseUp() {
    var _$dom$current, _$dom$current2;
    dragRef.current = undefined;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    (_$dom$current = $dom.current) === null || _$dom$current === void 0 || _$dom$current.removeEventListener('touchmove', handleMouseMove);
    (_$dom$current2 = $dom.current) === null || _$dom$current2 === void 0 || _$dom$current2.removeEventListener('touchend', handleMouseUp);
  }
  function handleMouseDown(event) {
    var _changedTouches$2, _$dom$current3, _$dom$current4;
    event.preventDefault();
    var clientY = event.clientY || ((_changedTouches$2 = event.changedTouches[0]) === null || _changedTouches$2 === void 0 ? void 0 : _changedTouches$2.clientY);
    dragRef.current = {
      height: heightRef.current,
      dragY: clientY
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    (_$dom$current3 = $dom.current) === null || _$dom$current3 === void 0 || _$dom$current3.addEventListener('touchmove', handleMouseMove, {
      passive: false
    });
    (_$dom$current4 = $dom.current) === null || _$dom$current4 === void 0 || _$dom$current4.addEventListener('touchend', handleMouseUp, {
      passive: false
    });
  }
  (0, _react.useEffect)(function () {
    if (document) {
      var _$dom$current5, _$dom$current6;
      (_$dom$current5 = $dom.current) === null || _$dom$current5 === void 0 || _$dom$current5.addEventListener('touchstart', handleMouseDown, {
        passive: false
      });
      (_$dom$current6 = $dom.current) === null || _$dom$current6 === void 0 || _$dom$current6.addEventListener('mousedown', handleMouseDown);
    }
    return function () {
      if (document) {
        var _$dom$current7;
        (_$dom$current7 = $dom.current) === null || _$dom$current7 === void 0 || _$dom$current7.removeEventListener('touchstart', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  var svg = (0, _react.useMemo)(function () {
    return /*#__PURE__*/(0, _jsxRuntime.jsx)("svg", {
      viewBox: "0 0 512 512",
      height: "100%",
      children: /*#__PURE__*/(0, _jsxRuntime.jsx)("path", {
        fill: "currentColor",
        d: "M304 256c0 26.5-21.5 48-48 48s-48-21.5-48-48 21.5-48 48-48 48 21.5 48 48zm120-48c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zm-336 0c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48z"
      })
    });
  }, []);
  return /*#__PURE__*/(0, _jsxRuntime.jsx)("div", {
    className: "".concat(prefixCls, "-bar"),
    ref: $dom,
    children: svg
  });
};
var _default = exports["default"] = DragBar;
module.exports = exports.default;