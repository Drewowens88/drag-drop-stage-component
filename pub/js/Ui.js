var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
define(["require", "exports", "./Types", "./utils/Events", "./utils/DomMetrics"], function (require, exports, Types_1, Events_1, DomMetrics) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Ui = void 0;
    class Ui {
        constructor(iframe, overlay, store) {
            this.iframe = iframe;
            this.overlay = overlay;
            this.store = store;
            this.boxes = [];
            this.unsubscribeAll = [];
            // listen to events
            this.unsubscribeAll.push(
            // addEvent(win, 'resize', () => this.resizeOverlay()),
            Events_1.addEvent(window, 'resize', () => this.resizeOverlay()), store.subscribe((selectables) => this.update(selectables), (state) => state.selectables), store.subscribe((state, prevState) => this.onMouseChanged(state, prevState), (state) => state.mouse), store.subscribe((state, prevState) => this.onUiChanged(state, prevState), (state) => state.ui));
            // init iframes
            this.resizeOverlay();
            this.overlay.contentDocument.body.style.overflow = 'auto';
            iframe.contentDocument.body.style.overflow = 'scroll'; // FIXME: this could be a problem if saved with the site, what other solution?
            // add UI styles
            this.overlay.contentDocument.head.innerHTML = `
      <style>
        body {
          overflow: scroll;
          margin: -5px;
        }

        body.dragging-mode .box.not-selected.not-aboutToDrop,
        body.resizing-mode .box.not-selected { display: none; }

        .aboutToDrop, .selected.box, .box.target {
          border: 1px solid rgba(0, 0, 0, .5);
        }
        .box.aboutToDrop:before,
        .box.selected:before,
        .box.target:before {
          content: ' ';
          position: absolute;
          z-index: -1;
          top: 1px;
          left: 1px;
          right: 1px;
          bottom: 1px;
          border: 1px solid rgba(255, 255, 255, .3);
        }
        .not-selectable,
        .not-selected .handle { display: none; }

        .handle {
          position: absolute;
          z-index: 999;
          border: 1px solid rgba(0, 0, 0, .5);
          background-color: rgba(255, 255, 255, 1);
          width: 5px;
          height: 5px;
          border-radius: 2.5px;
        }
        .handle-nw { top: -4px; left: -4px; }
        .not-resizeable-nw .handle-nw { display: none; }

        .handle-ne { top: -4px; right: -4px; }
        .not-resizeable-ne .handle-ne { display: none; }

        .handle-sw { bottom: -4px; left: -4px; }
        .not-resizeable-sw .handle-sw { display: none; }

        .handle-se { bottom: -4px; right: -4px; }
        .not-resizeable-se .handle-se { display: none; }

        .region-marker {
          background-color: rgba(0, 0, 0, .1);
          border: 1px solid rgba(255, 255, 255, .5);
          display: flex;
          position: absolute;
          left: 0;
          top: 0;
          min-width: 1px;
          min-height: 1px;
        }

        .stycky-left { border-left-color: red !important; }
        .stycky-top { border-top-color: red !important; }
        .stycky-right { border-right-color: red !important; }
        .stycky-bottom { border-bottom-color: red !important; }
    `;
        }
        static createUi(iframe, store) {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => {
                    const doc = DomMetrics.getDocument(iframe);
                    const overlay = doc.createElement('iframe');
                    doc.body.appendChild(overlay);
                    if (overlay.contentDocument.readyState === 'complete') {
                        // chrome
                        resolve(new Ui(iframe, overlay, store));
                    }
                    else {
                        // firefox
                        overlay.contentWindow.onload = () => {
                            resolve(new Ui(iframe, overlay, store));
                        };
                    }
                });
            });
        }
        resizeOverlay() {
            this.resize();
        }
        cleanup() {
            this.unsubscribeAll.forEach(u => u());
            this.overlay.parentElement.removeChild(this.overlay);
            this.overlay = null;
        }
        // private getScrollData(iframe: HTMLIFrameElement): ScrollData {
        //   return {
        //     x: iframe.contentWindow.document.scrollingElement.scrollWidth,
        //     y: iframe.contentWindow.document.scrollingElement.scrollHeight,
        //   };
        // }
        resize() {
            const metrics = DomMetrics.getMetrics(this.iframe);
            const zIndex = this.iframe.contentWindow.getComputedStyle(this.iframe).getPropertyValue('z-index');
            metrics.position = 'absolute';
            DomMetrics.setMetrics(this.overlay, metrics, false, true);
            this.overlay.style.backgroundColor = 'transparent';
            this.overlay.style.zIndex = ((parseInt(zIndex) || 0) + 1).toString();
            this.overlay.style.border = 'none';
        }
        onUiChanged(state, prevState) {
            if (state.catchingEvents !== prevState.catchingEvents || state.mode !== prevState.mode) {
                // this is to give the focus on the UI, and not prevent the user from pressing tab again
                this.overlay.style.pointerEvents = state.catchingEvents ? '' : 'none';
                if (state.mode === Types_1.UiMode.HIDE) {
                    this.overlay.style.top = "-999999px";
                    this.overlay.style.left = "-999999px";
                    this.overlay.style.width = "0";
                    this.overlay.style.height = "0";
                }
                else {
                    this.resizeOverlay();
                }
            }
        }
        onMouseChanged(state, prevState) {
            if (state.scrollData.x !== prevState.scrollData.x || state.scrollData.y !== prevState.scrollData.y) {
                DomMetrics.setScroll(this.overlay.contentDocument, state.scrollData);
                // adjust scroll - sometimes there is a 1px difference because of the border of the UI
                if (this.store.getState().ui.mode !== Types_1.UiMode.HIDE) {
                    DomMetrics.setScroll(this.iframe.contentDocument, state.scrollData);
                    const newScrollData = DomMetrics.getScroll(this.iframe.contentDocument);
                    if (state.scrollData.x !== newScrollData.x || state.scrollData.y !== newScrollData.y) {
                        // there is a delta in scroll
                        DomMetrics.setScroll(this.overlay.contentDocument, newScrollData);
                    }
                }
            }
            if (state.cursorData.cursorType !== prevState.cursorData.cursorType) {
                this.overlay.contentDocument.body.style.cursor = state.cursorData.cursorType;
            }
        }
        update(selectables) {
            //  update scroll
            const { scrollWidth, scrollHeight } = this.iframe.contentWindow.document.scrollingElement;
            this.overlay.contentDocument.body.style.width = scrollWidth + 'px';
            this.overlay.contentDocument.body.style.height = scrollHeight + 'px';
            // remove the UIs that have no corresponding element in the stage
            this.boxes
                .filter(r => !selectables.find(s => r.selectable.el === s.el))
                .forEach(r => r.ui.parentElement.removeChild(r.ui));
            // remove the boxes
            this.boxes = this.boxes
                .filter(r => selectables.find(s => r.selectable.el === s.el));
            // add the missing boxes
            this.boxes = this.boxes.concat(selectables
                // only the missing ones
                .filter(s => !this.boxes.find(r => r.selectable.el === s.el))
                // create a box object
                .map(s => ({
                selectable: s,
                // append a new div to the overlay
                ui: this.overlay.contentDocument.body.appendChild(this.createBoxUi()),
            })));
            // update the view
            const mode = this.store.getState().ui.mode;
            const dropZones = mode === Types_1.UiMode.DRAG ? selectables.filter(s => s.dropZone && s.dropZone.parent).map(s => s.dropZone.parent)
                : [];
            this.boxes
                .map(r => this.updateBox(r, selectables.find(s => s.el === r.selectable.el), dropZones));
        }
        createBoxUi() {
            const box = this.overlay.contentDocument.createElement('div');
            box.innerHTML = `
      <div class='handle handle-nw'></div>
      <div class='handle handle-ne'></div>
      <div class='handle handle-sw'></div>
      <div class='handle handle-se'></div>
    `;
            return box;
        }
        updateBox(box, selectable, dropZones) {
            const sticky = selectable.selected ? this.store.getState().ui.sticky : { top: null, left: null, bottom: null, right: null };
            const aboutToDrop = !!dropZones.find(el => el === selectable.el);
            const target = this.store.getState().mouse.mouseData.target === box.selectable.el;
            box.selectable = selectable;
            DomMetrics.setMetrics(box.ui, Object.assign(Object.assign({}, box.selectable.metrics), { position: 'absolute', padding: { top: 0, left: 0, bottom: 0, right: 0 }, margin: { top: 0, left: 0, bottom: 0, right: 0 }, border: { top: 1, left: 1, bottom: 1, right: 1 } }), false, true);
            box.ui.classList.remove(...[
                !box.selectable.selected ? 'selected' : 'not-selected',
                !box.selectable.selectable ? 'selectable' : 'not-selectable',
                !box.selectable.draggable ? 'draggable' : 'not-draggable',
                !box.selectable.hovered ? 'hover' : 'not-hover',
                !target ? 'target' : 'not-target',
                (!box.selectable.resizeable.top && !box.selectable.resizeable.left) ? 'resizeable-nw' : 'not-resizeable-nw',
                (!box.selectable.resizeable.top && !box.selectable.resizeable.right) ? 'resizeable-ne' : 'not-resizeable-ne',
                (!box.selectable.resizeable.bottom && !box.selectable.resizeable.left) ? 'resizeable-sw' : 'not-resizeable-sw',
                (!box.selectable.resizeable.bottom && !box.selectable.resizeable.right) ? 'resizeable-se' : 'not-resizeable-se',
                !box.selectable.isDropZone ? 'isDropZone' : 'not-isDropZone',
                !sticky.left ? 'stycky-left' : 'not-stycky-left',
                !sticky.top ? 'stycky-top' : 'not-stycky-top',
                !sticky.right ? 'stycky-right' : 'not-stycky-right',
                !sticky.bottom ? 'stycky-bottom' : 'not-stycky-bottom',
                !aboutToDrop ? 'aboutToDrop' : 'not-aboutToDrop',
            ]);
            box.ui.classList.add(...[
                'box',
                box.selectable.selected ? 'selected' : 'not-selected',
                box.selectable.selectable ? 'selectable' : 'not-selectable',
                box.selectable.draggable ? 'draggable' : 'not-draggable',
                box.selectable.hovered ? 'hover' : 'not-hover',
                target ? 'target' : 'not-target',
                (box.selectable.resizeable.top && box.selectable.resizeable.left) ? 'resizeable-nw' : 'not-resizeable-nw',
                (box.selectable.resizeable.top && box.selectable.resizeable.right) ? 'resizeable-ne' : 'not-resizeable-ne',
                (box.selectable.resizeable.bottom && box.selectable.resizeable.left) ? 'resizeable-sw' : 'not-resizeable-sw',
                (box.selectable.resizeable.bottom && box.selectable.resizeable.right) ? 'resizeable-se' : 'not-resizeable-se',
                box.selectable.isDropZone ? 'isDropZone' : 'not-isDropZone',
                sticky.left ? 'stycky-left' : 'not-stycky-left',
                sticky.top ? 'stycky-top' : 'not-stycky-top',
                sticky.right ? 'stycky-right' : 'not-stycky-right',
                sticky.bottom ? 'stycky-bottom' : 'not-stycky-bottom',
                aboutToDrop ? 'aboutToDrop' : 'not-aboutToDrop',
            ]);
            return box;
        }
        /**
         * hide the whole UI
         */
        hideUi(hide) {
            this.overlay.contentDocument.body.style.display = hide ? 'none' : '';
        }
    }
    exports.Ui = Ui;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVWkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdHMvVWkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQVVBLE1BQWEsRUFBRTtRQXVCYixZQUE0QixNQUF5QixFQUFTLE9BQTBCLEVBQVUsS0FBaUI7WUFBdkYsV0FBTSxHQUFOLE1BQU0sQ0FBbUI7WUFBUyxZQUFPLEdBQVAsT0FBTyxDQUFtQjtZQUFVLFVBQUssR0FBTCxLQUFLLENBQVk7WUF0QnpHLFVBQUssR0FBZSxFQUFFLENBQUM7WUFzSHpCLG1CQUFjLEdBQXNCLEVBQUUsQ0FBQztZQS9GN0MsbUJBQW1CO1lBQ25CLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSTtZQUN0Qix1REFBdUQ7WUFDdkQsaUJBQVEsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxFQUN0RCxLQUFLLENBQUMsU0FBUyxDQUNiLENBQUMsV0FBbUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFDakUsQ0FBQyxLQUFZLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQ3BDLEVBQ0QsS0FBSyxDQUFDLFNBQVMsQ0FDYixDQUFDLEtBQWlCLEVBQUUsU0FBcUIsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLEVBQ25GLENBQUMsS0FBVyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUM3QixFQUNELEtBQUssQ0FBQyxTQUFTLENBQ2IsQ0FBQyxLQUFjLEVBQUUsU0FBa0IsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLEVBQzFFLENBQUMsS0FBVyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUMxQixDQUNGLENBQUM7WUFFRixlQUFlO1lB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