define(["require", "exports", "../utils/DomMetrics"], function (require, exports, DomMetrics) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SelectablesObserver = void 0;
    /**
     * @class This class listens to the store
     *   and apply the state changes to the DOM elements
     */
    class SelectablesObserver {
        constructor(stageDocument, overlayDocument, store, hooks) {
            this.stageDocument = stageDocument;
            this.overlayDocument = overlayDocument;
            this.store = store;
            this.hooks = hooks;
            this.isRefreshing = false;
            this.unsubscribeAll = [];
            this.unsubscribeAll.push(store.subscribe((state, prevState) => this.onStateChanged(state, prevState), (state) => state.selectables), store.subscribe((state, prevState) => this.onUiChanged(state), (state) => state.ui));
        }
        onUiChanged(state) {
            this.isRefreshing = state.refreshing;
        }
        cleanup() {
            this.unsubscribeAll.forEach(u => u());
        }
        /**
         * handle state changes, detect changes of scroll or metrics or selection
         * @param {State} state
         * @param {State} prevState the old state obj
         */
        onStateChanged(state, prevState) {
            // select selectables which have changed
            const filterBy = (propName, selectable) => {
                const oldSelectable = prevState.find(old => selectable.el === old.el);
                // FIXME: use JSON.stringify to compare?
                return !oldSelectable || JSON.stringify(oldSelectable[propName]) !== JSON.stringify(selectable[propName]);
                // return !oldSelectable || oldSelectable[propName] !== selectable[propName];
            };
            const removed = prevState.filter(s => !state.find(s2 => s2.el === s.el));
            const metrics = state.filter(selectable => filterBy('metrics', selectable));
            if (removed.length + metrics.length > 0)
                this.onMetrics(metrics, removed);
            const selection = state.filter(selectable => filterBy('selected', selectable));
            if (selection.length > 0)
                this.onSelection(selection);
            // const draggable = state.filter(selectable => filterBy('draggable', selectable));
            // if(draggable.length > 0) this.onDraggable(draggable);
            // const resizeable = state.filter(selectable => filterBy('resizeable', selectable));
            // if(resizeable.length > 0) this.onResizeable(resizeable);
            // const isDropZone = state.filter(selectable => filterBy('isDropZone', selectable));
            // if(isDropZone.length > 0) this.onDropZone(isDropZone);
            const translation = state.filter(selectable => filterBy('translation', selectable));
            if (translation.length > 0)
                this.onTranslation(translation);
        }
        // update elements position and size
        onMetrics(selectables, removed) {
            if (!this.isRefreshing) {
                selectables.forEach(selectable => {
                    // while being dragged, elements are out of the flow, do not apply styles
                    if (!selectable.preventMetrics) {
                        DomMetrics.setMetrics(selectable.el, selectable.metrics, selectable.useMinHeight);
                    }
                });
                // notify the app
                if (this.hooks.onChange)
                    this.hooks.onChange(selectables.concat(removed));
            }
        }
        onSelection(selectables) {
            // notify the app
            if (this.hooks.onSelect)
                this.hooks.onSelect(selectables);
        }
        // onDraggable(selectables: Array<SelectableState>) {}
        // onResizeable(selectables: Array<SelectableState>) {}
        // onDropZone(selectables: Array<SelectableState>) {}
        onTranslation(selectables) {
            selectables.forEach(selectable => {
                if (!!selectable.translation) {
                    selectable.el.style.transform = `translate(${selectable.translation.x}px, ${selectable.translation.y}px)`;
                    selectable.el.style.zIndex = '99999999';
                    if (selectable.metrics.position === 'static') {
                        selectable.el.style.top = '0';
                        selectable.el.style.left = '0';
                        selectable.el.style.position = 'relative';
                    }
                }
                else {
                    selectable.el.style.transform = '';
                    selectable.el.style.zIndex = '';
                    selectable.el.style.position = '';
                }
            });
        }
    }
    exports.SelectablesObserver = SelectablesObserver;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2VsZWN0YWJsZXNPYnNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy90cy9vYnNlcnZlcnMvU2VsZWN0YWJsZXNPYnNlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0lBS0E7OztPQUdHO0lBQ0gsTUFBYSxtQkFBbUI7UUFDOUIsWUFBb0IsYUFBMkIsRUFBVSxlQUE2QixFQUFVLEtBQWlCLEVBQVUsS0FBa0I7WUFBekgsa0JBQWEsR0FBYixhQUFhLENBQWM7WUFBVSxvQkFBZSxHQUFmLGVBQWUsQ0FBYztZQUFVLFVBQUssR0FBTCxLQUFLLENBQVk7WUFBVSxVQUFLLEdBQUwsS0FBSyxDQUFhO1lBYXJJLGlCQUFZLEdBQVksS0FBSyxDQUFDO1lBSzlCLG1CQUFjLEdBQXNCLEVBQUUsQ0FBQztZQWpCN0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQ3RCLEtBQUssQ0FBQyxTQUFTLENBQ2IsQ0FBQyxLQUE2QixFQUFFLFNBQWlDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxFQUMzRyxDQUFDLEtBQWlCLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQ3pDLEVBQ0QsS0FBSyxDQUFDLFNBQVMsQ0FDYixDQUFDLEtBQW9CLEVBQUUsU0FBd0IsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsRUFDM0UsQ0FBQyxLQUFpQixFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUNoQyxDQUNGLENBQUM7UUFDSixDQUFDO1FBR0QsV0FBVyxDQUFDLEtBQW9CO1lBQzlCLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQztRQUN2QyxDQUFDO1FBR0QsT0FBTztZQUNMLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMs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