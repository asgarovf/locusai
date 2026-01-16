import copyTextToClipboard from '@uiw/copy-to-clipboard';
import { useEffect } from 'react';
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
export function useCopied(container) {
  var handle = event => {
    var target = getParentElement(event.target);
    if (!target) return;
    target.classList.add('active');
    copyTextToClipboard(target.dataset.code, function () {
      setTimeout(() => {
        target.classList.remove('active');
      }, 2000);
    });
  };
  useEffect(() => {
    var _container$current, _container$current2;
    (_container$current = container.current) == null || _container$current.removeEventListener('click', handle, false);
    (_container$current2 = container.current) == null || _container$current2.addEventListener('click', handle, false);
    return () => {
      var _container$current3;
      (_container$current3 = container.current) == null || _container$current3.removeEventListener('click', handle, false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container]);
}