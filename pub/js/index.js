define(["require", "exports", "./Types", "./utils/Polyfill", "./utils/DomMetrics", "./Keyboard", "./Mouse", "./flux/SelectionState", "./flux/UiState", "./observers/SelectablesObserver", "./observers/DomObserver", "./observers/MouseObserver", "./observers/UiObserver", "./flux/StageStore", "./flux/SelectableState", "./flux/MouseState", "./Ui", "./utils/Events"], function (require, exports, types, Polyfill, DomMetrics, Keyboard_1, Mouse_1, selectionState, UiAction, SelectablesObserver_1, DomObserver_1, MouseObserver_1, UiObserver_1, StageStore_1, SelectableState_1, MouseState_1, Ui_1, Events_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Stage = void 0;
    /**
     * This class is the entry point of the library
     * @see https://github.com/silexlabs/drag-drop-stage-component
     * @class Stage
     */
    class Stage {
        /**
         * Init the useful classes,
         * add styles to the iframe for the UI,
         * listen to mouse events in the iframe and outside
         * @constructor
         */
        constructor(iframe, elements, options = {}) {
            this.unsubscribeAll = [];
            this.waitingListeners = [];
            // expose for client app
            window['Stage'] = Stage;
            // store the params
            this.iframe = iframe;
            this.contentWindow = this.iframe.contentWindow;
            this.contentDocument = this.iframe.contentDocument;
            this.hooks = Object.assign(Object.assign({}, options), { getId: options.getId || (el => {
                    if (el.hasAttribute('data-stage-id'))
                        return el.getAttribute('data-stage-id');
                    const id = Math.round(Math.random() * 999999).toString();
                    el.setAttribute('data-stage-id', id);
                    return id;
                }), isSelectable: options.isSelectable || (el => el.classList.contains('selectable')), isDraggable: options.isDraggable || (el => el.classList.contains('draggable')), isDropZone: options.isDropZone || ((el) => el.classList.contains('droppable')), isResizeable: options.isResizeable || ((el) => el.classList.contains('resizeable')), useMinHeight: options.useMinHeight || ((el) => true), canDrop: options.canDrop || ((el, dropZone) => true) });
            // polyfill the iframe
            Polyfill.patchWindow(this.contentWindow);
            // create the store
            this.store = new StageStore_1.StageStore();
            // add a UI over the iframe
            Ui_1.Ui.createUi(iframe, this.store)
                .then((ui) => {
                this.ui = ui;
                // state observers
                this.selectablesObserver = new SelectablesObserver_1.SelectablesObserver(this.contentDocument, this.ui.overlay.contentDocument, this.store, this.hooks);
                this.domObserver = new DomObserver_1.DomObserver(this.store, (state, entries) => this.domObserverCallback(state, entries));
                this.uiObserver = new UiObserver_1.UiObserver(this.contentDocument, this.ui.overlay.contentDocument, this.store, this.hooks);
                this.mouseObserver = new MouseObserver_1.MouseObserver(this.contentDocument, this.ui.overlay.contentDocument, this.store, this.hooks);
                // controllers
                this.mouse = new Mouse_1.Mouse(this.contentWindow, this.ui.overlay.contentWindow, this.store, this.hooks);
                const keyboard = new Keyboard_1.Keyboard(this.ui.overlay.contentWindow, this.store, this.hooks);
                this.unsubscribeAll.push(() => this.selectablesObserver.cleanup(), () => this.domObserver.cleanup(), () => this.uiObserver.cleanup(), () => this.mouseObserver.cleanup(), () => this.mouse.cleanup(), () => keyboard.cleanup(), Events_1.addEvent(window, 'resize', () => this.updateMetrics()));
                // populate the store
                this.reset(elements);
                // finish init
                this.waitingListeners.forEach(l => l());
                this.waitingListeners = [];
            });
        }
        /**
         * DOM observers say some elements changed
         * We need to update their metrics
         */
        domObserverCallback(state, entries) {
            // mutation observers are not used anymore
            // they use to detect changes many times
            // const updated: HTMLElement[] = [];
            // entries.forEach((entry) => {
            //   if (entry.type === 'childList') {
            //     // update children UI when their order changed
            //     const children: HTMLElement[] = Array.from(entry.target.children)
            //     // TODO: also add the elements children recursively
            //     updated.push(...children);
            //   } else {
            //     // update the target itself
            //     updated.push(entry.target);
            //   }
            // })
            // this.updateMetrics(updated);
            this.updateMetrics(entries.map((entry) => entry.target)
                .concat(state.el));
        }
        /**
         * update the position and size of the UI
         */
        updateMetrics(updated = null) {
            const updateStates = updated ? updated
                .map((el) => this.getState(el))
                .filter((state) => !!state)
                : this.store.getState().selectables;
            // add children
            const children = this.store.getState().selectables
                .filter((state) => this.getParents(state.el)
                .some((parentEl) => updateStates
                .some((updateState) => updateState.el === parentEl)));
            // remove duplicates
            const states = [...new Set(updateStates.concat(children))];
            // update metrics of the updated states
            if (states.length > 0) {
                this.store.dispatch(UiAction.setRefreshing(true));
                this.store.dispatch(SelectableState_1.updateSelectables(states.map(selectable => (Object.assign(Object.assign({}, selectable), { metrics: DomMetrics.getMetrics(selectable.el) })))));
                this.store.dispatch(UiAction.setRefreshing(false));
                //this.ui.update(states, this.getScroll())
            }
        }
        /**
         * get all parents of an element in the dom
         */
        getParents(el) {
            return el ? this.getParents(el.parentElement).concat(el.parentElement ? [el.parentElement] : [])
                : [];
        }
        /**
         * start draging the selection without a mouse click
         */
        startDrag() {
            // const bb = DomMetrics.getBoundingBoxDocument(target.el)
            const selection = this.getSelection();
            const bb = DomMetrics.getBoundingBox(selection);
            this.mouse.mouseMode = Mouse_1.MouseMode.DRAGGING;
            this.store.dispatch(UiAction.setMode(types.UiMode.DRAG));
            // as if the mouse was initially in the middle of the first selected element
            this.uiObserver.handler.initialMouse = {
                x: bb.left + (bb.width / 2) - this.iframe.contentWindow.scrollX,
                y: bb.top + (bb.height / 2) - this.iframe.contentWindow.scrollY,
            };
        }
        /**
         * to be called before deleting the stage
         */
        cleanup() {
            this.unsubscribeAll.forEach(u => u());
            this.ui.cleanup();
            this.ui = null;
        }
        /**
         * enable/disable catching events
         */
        get catchingEvents() {
            return this.store.getState().ui.catchingEvents;
        }
        set catchingEvents(val) {
            this.store.dispatch(UiAction.setCatchingEvents(val));
        }
        /**
         * enable/disable catching events
         */
        get visible() {
            return this.store.getState().ui.mode !== types.UiMode.HIDE;
        }
        set visible(val) {
            // dispatch UI mode change
            this.store.dispatch(UiAction.setMode(val ? types.UiMode.NONE : types.UiMode.HIDE));
            // scroll may have changed
            this.setScroll({
                x: this.iframe.contentWindow.scrollX,
                y: this.iframe.contentWindow.scrollY,
            });
        }
        /**
         * enable/disable sticky
         */
        get enableSticky() {
            return this.store.getState().ui.enableSticky;
        }
        set enableSticky(val) {
            // dispatch UI mode change
            this.store.dispatch(UiAction.setEnableSticky(val));
        }
        /**
         * force resize of UI
         */
        resizeWindow() {
            this.ui.resizeOverlay();
        }
        /**
         * safe subscribe to mouse event
         * handle the multiple iframes and the current window
         * @return function to call to unsubscribe
         */
        subscribeMouseEvent(type, cbk) {
            let unsub;
            if (!this.mouse) {
                this.waitingListeners.push(() => {
                    unsub = this.subscribeMouseEvent(type, cbk);
                });
                return () => unsub();
            }
            return this.mouse.subscribeMouseEvent(type, cbk);
        }
        /**
         * hide the whole UI
         */
        hideUi(hide) {
            this.ui.hideUi(hide);
        }
        ///////////////////////////////////////////////////
        // Elements and metrics
        ///////////////////////////////////////////////////
        reset(elements) {
            this.store.dispatch(UiAction.setRefreshing(true));
            this.store.dispatch(SelectableState_1.resetSelectables());
            Array.from(elements).forEach(el => this.addElement(el, false));
            this.store.dispatch(UiAction.setRefreshing(false));
        }
        /**
         * get/set the states of the selected elements
         */
        getSelection() {
            return DomMetrics.getSelection(this.store);
        }
        /**
         * get/set the states of the selected elements
         */
        setSelection(elements) {
            this.store.dispatch(selectionState.set(elements.map(el => this.getState(el))));
        }
        /**
         * get/set the state for an element
         */
        getState(el) {
            return DomMetrics.getSelectableState(this.store, el);
        }
        /**
         * get/set the state for an element
         */
        setState(el, subState) {
            const state = this.getState(el);
            this.store.dispatch(SelectableState_1.updateSelectables([Object.assign(Object.assign({}, state), subState)]));
        }
        /**
         * Add an element to the store
         */
        addElement(el, preventDispatch = true) {
            const state = {
                id: this.hooks.getId(el),
                el,
                selected: false,
                hovered: false,
                selectable: this.hooks.isSelectable(el),
                draggable: this.hooks.isDraggable(el),
                resizeable: this.getElementResizeable(el),
                isDropZone: this.hooks.isDropZone(el),
                useMinHeight: this.hooks.useMinHeight(el),
                metrics: DomMetrics.getMetrics(el),
            };
            if (preventDispatch) {
                // do not apply style change to this element
                this.store.dispatch(UiAction.setRefreshing(true));
                // still add it to the dom observer
                // FIXME: prevent the prenvent dispatch is not smart, event prevent a dispatch is not smart
                // FIXME: start listening after dispatch store since metrics are already computed
                this.domObserver.onAdded(state);
            }
            // create an element in the store
            this.store.dispatch(SelectableState_1.createSelectable(state));
            if (preventDispatch) {
                this.store.dispatch(UiAction.setRefreshing(false));
            }
        }
        getElementResizeable(el) {
            const boolOrObj = this.hooks.isResizeable(el);
            return typeof boolOrObj === 'object' ? boolOrObj : {
                top: boolOrObj,
                left: boolOrObj,
                bottom: boolOrObj,
                right: boolOrObj,
            };
        }
        /**
         * Remove an element from the store
         */
        removeElement(id) {
            this.store.dispatch(SelectableState_1.deleteSelectable(this.store.getState().selectables.find(s => s.id === id)));
        }
        /**
         * get the best drop zone at a given position
         * if the `el` param is provided, filter possible drop zones with the `canDrop` hook
         */
        getDropZone(x, y, el = null) {
            const dropZones = DomMetrics.findDropZonesUnderMouse(this.contentDocument, this.store, this.hooks, x, y);
            if (!!el)
                return dropZones.filter(dropZone => this.hooks.canDrop(el, dropZone))[0];
            else
                return dropZones[0];
        }
        getBoundingBox(elements) {
            const state = this.store.getState();
            return DomMetrics.getBoundingBox(elements.map(el => state.selectables.find(s => s.id === this.hooks.getId(el))));
        }
        getSelectionBox() {
            return DomMetrics.getBoundingBox(DomMetrics.getSelection(this.store));
        }
        ///////////////////////////////////////////////////
        // Scroll
        ///////////////////////////////////////////////////
        /**
         * scroll so that the elements are visible
         */
        show(elements) {
            const state = this.store.getState();
            const bb = DomMetrics.getBoundingBox(elements.map(el => state.selectables.find(s => s.id === this.hooks.getId(el))));
            const initialScroll = state.mouse.scrollData;
            const scroll = DomMetrics.getScrollToShow(this.contentDocument, bb);
            if (scroll.x !== initialScroll.x || scroll.y !== initialScroll.y) {
                this.store.dispatch(MouseState_1.setScroll(scroll));
            }
        }
        /**
         * scroll so that the elements are centered
         */
        center(elements) {
            const state = this.store.getState();
            const bb = DomMetrics.getBoundingBox(elements
                .map(el => state.selectables.find(s => s.id === this.hooks.getId(el)))
                .filter(s => !!s));
            const initialScroll = state.mouse.scrollData;
            const scrollSize = {
                x: this.contentWindow.innerWidth,
                y: this.contentWindow.innerHeight,
            };
            const scroll = {
                x: Math.max(0, Math.round(bb.left + (bb.width / 2) - (scrollSize.x / 2))),
                y: Math.max(0, Math.round(bb.top + (bb.height / 2) - (scrollSize.y / 2))),
            };
            if (scroll.x !== initialScroll.x || scroll.y !== initialScroll.y) {
                this.store.dispatch(MouseState_1.setScroll(scroll));
            }
        }
        /**
         * get/set the stage scroll data
         */
        setScroll(scroll) {
            const initialScroll = this.store.getState().mouse.scrollData;
            if (scroll.x !== initialScroll.x || scroll.y !== initialScroll.y) {
                this.store.dispatch(MouseState_1.setScroll(scroll));
            }
        }
        /**
         * get/set the stage scroll data
         */
        getScroll() {
            return this.store.getState().mouse.scrollData;
        }
    }
    exports.Stage = Stage;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdHMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztJQW1CQTs7OztPQUlHO0lBQ0gsTUFBYSxLQUFLO1FBZWhCOzs7OztXQUtHO1FBQ0gsWUFBWSxNQUF5QixFQUFFLFFBQWdDLEVBQUUsVUFBcUIsRUFBRTtZQWhCdEYsbUJBQWMsR0FBc0IsRUFBRSxDQUFDO1lBa05qRCxxQkFBZ0IsR0FBc0IsRUFBRSxDQUFDO1lBak12Qyx3QkFBd0I7WUFDeEIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEtBQUssQ0FBQztZQUV4QixtQkFBbUI7WUFDbkIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7WUFDckIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQztZQUMvQyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDO1lBQ25ELElBQUksQ0FBQyxLQUFLLG1DQUNMLE9BQU8sS0FDVixLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFO29CQUM1QixJQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDO3dCQUFFLE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQztvQkFDN0UsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ3pELEVBQUUsQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNyQyxPQUFPLEVBQUUsQ0FBQztnQkFDWixDQUFDLENBQUMsRUFDRixZQUFZLEVBQUUsT0FBTyxDQUFDLFlBQVksSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxD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