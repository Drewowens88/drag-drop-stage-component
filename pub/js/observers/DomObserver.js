define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DomObserver = exports.removeDomObserver = exports.addDomObserver = exports.resetDomObservers = exports.initDomObservers = exports.domObservers = void 0;
    ;
    // dom observers instances, exposed for unit tests
    exports.domObservers = new Map();
    function initDomObservers(elements, onChanged) {
        resetDomObservers();
        elements.forEach((el) => addDomObserver(el, onChanged));
    }
    exports.initDomObservers = initDomObservers;
    ;
    function resetDomObservers() {
        Array.from(exports.domObservers.keys())
            .forEach((el) => removeDomObserver(el));
    }
    exports.resetDomObservers = resetDomObservers;
    ;
    function addDomObserver(el, onChanged) {
        if (typeof ResizeObserver === 'undefined') {
            throw new Error('ResizeObserver is not supported by your browser. The drag and drop features will not work properly');
        }
        if (exports.domObservers.has(el)) {
            removeDomObserver(el);
        }
        const resizeObserver = new ResizeObserver(onChanged);
        resizeObserver.observe(el, {});
        const mutationObserver = new MutationObserver(onChanged);
        // FIXME: mutation observer is disabled => remove useless mutationObserver
        // mutationObserver.observe(el, {
        //   subtree: true,
        //   childList: true,
        //   attributes: true,
        //   attributeOldValue: false,
        //   characterData: true,
        //   characterDataOldValue: false,
        // });
        exports.domObservers.set(el, { mutationObserver, resizeObserver });
    }
    exports.addDomObserver = addDomObserver;
    ;
    function removeDomObserver(el) {
        if (exports.domObservers.has(el)) {
            const { mutationObserver, resizeObserver } = exports.domObservers.get(el);
            resizeObserver.disconnect();
            mutationObserver.disconnect();
            mutationObserver.takeRecords();
            exports.domObservers.delete(el);
        }
        else {
            throw new Error('DOM observer not found for this DOM element');
        }
    }
    exports.removeDomObserver = removeDomObserver;
    ;
    /**
     * @class This class listens to the store
     *   and observe the dom elements in order to keep the metrics in sync
     *   using MutationObserver and ResizeObserver APIs of the browser
     */
    class DomObserver {
        constructor(store, cbk) {
            this.cbk = cbk;
            this.unsubscribeAll = [];
            this.unsubscribeAll.push(store.subscribe((state, prevState) => this.onStateChanged(state, prevState), (state) => state.selectables));
        }
        cleanup() {
            this.unsubscribeAll.forEach(u => u());
            resetDomObservers();
        }
        onRemoved(state) {
            removeDomObserver(state.el);
        }
        onAdded(state) {
            addDomObserver(state.el, (entries) => this.onChanged(state, entries));
        }
        onChanged(state, entries) {
            this.cbk(state, entries);
        }
        /**
         * handle state changes, detect changes of scroll or metrics or selection
         * @param {State} state
         * @param {State} prevState the old state obj
         */
        onStateChanged(state, prevState) {
            const added = state.filter(s => !prevState.find(s2 => s2.el === s.el));
            added.forEach((state) => this.onAdded(state));
            const removed = prevState.filter(s => !state.find(s2 => s2.el === s.el));
            removed.forEach((state) => this.onRemoved(state));
        }
    }
    exports.DomObserver = DomObserver;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRG9tT2JzZXJ2ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvdHMvb2JzZXJ2ZXJzL0RvbU9ic2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7SUFTQyxDQUFDO0lBRUYsa0RBQWtEO0lBQ3JDLFFBQUEsWUFBWSxHQUFHLElBQUksR0FBRyxFQUFxRixDQUFDO0lBQ3pILFNBQWdCLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxTQUFTO1FBQ2xELGlCQUFpQixFQUFFLENBQUM7UUFDcEIsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFIRCw0Q0FHQztJQUFBLENBQUM7SUFFRixTQUFnQixpQkFBaUI7UUFDL0IsS0FBSyxDQUFDLElBQUksQ0FBQyxvQkFBWSxDQUFDLElBQUksRUFBRSxDQUFDO2FBQzlCLE9BQU8sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBSEQsOENBR0M7SUFBQSxDQUFDO0lBRUYsU0FBZ0IsY0FBYyxDQUFDLEVBQWUsRUFBRSxTQUF3QztRQUN0RixJQUFJLE9BQU8sY0FBYyxLQUFLLFdBQVcsRUFBRTtZQUN6QyxNQUFNLElBQUksS0FBSyxDQUFDLG9HQUFvRyxDQUFDLENBQUM7U0FDdkg7UUFDRCxJQUFJLG9CQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ3hCLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ3ZCO1FBQ0QsTUFBTSxjQUFjLEdBQUcsSUFBSSxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDckQsY0FBYyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFL0IsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGdCQUFn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