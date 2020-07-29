define(["require", "exports", "./utils/Events", "./flux/UiState", "./flux/SelectionState", "./Types", "./flux/SelectableState", "./utils/DomMetrics"], function (require, exports, Events_1, UiState_1, SelectionState_1, Types_1, SelectableState_1, DomMetrics) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Keyboard = void 0;
    const MOVE_DISTANCE = 5;
    const SHIFT_MOVE_DISTANCE = 1;
    const ALT_MOVE_DISTANCE = 10;
    class Keyboard {
        constructor(win, store, hooks) {
            this.win = win;
            this.store = store;
            this.hooks = hooks;
            this.unsubscribeAll = [];
            // events from inside the iframe
            this.unsubscribeAll.push(Events_1.addEvent(window, 'keydown', (e) => this.onKeyDown(e)), Events_1.addEvent(win, 'keydown', (e) => this.onKeyDown(e)));
        }
        cleanup() {
            this.unsubscribeAll.forEach(u => u());
        }
        /**
         * handle shortcuts
         */
        onKeyDown(e) {
            const key = e.key;
            const state = this.store.getState();
            const target = e.target;
            if (state.ui.catchingEvents &&
                target.tagName.toLowerCase() !== 'input' &&
                target.tagName.toLowerCase() !== 'textarea' &&
                !target.hasAttribute('contenteditable')) {
                switch (key) {
                    case 'Escape':
                        if (state.ui.mode !== Types_1.UiMode.NONE) {
                            this.store.dispatch(UiState_1.setMode(Types_1.UiMode.NONE));
                            this.store.dispatch(SelectionState_1.reset());
                        }
                        break;
                    case 'Enter':
                        if (this.hooks.onEdit)
                            this.hooks.onEdit();
                        break;
                    case 'ArrowLeft':
                        this.move(-this.getDistance(e), 0);
                        break;
                    case 'ArrowUp':
                        this.move(0, -this.getDistance(e));
                        break;
                    case 'ArrowRight':
                        this.move(this.getDistance(e), 0);
                        break;
                    case 'ArrowDown':
                        this.move(0, this.getDistance(e));
                        break;
                    default:
                        return;
                }
                // only if we catched a shortcut
                e.preventDefault();
                e.stopPropagation();
            }
        }
        getDistance(e) {
            return e.shiftKey ? SHIFT_MOVE_DISTANCE :
                e.altKey ? ALT_MOVE_DISTANCE : MOVE_DISTANCE;
        }
        /**
         * function used to sort selectables before moving them
         * this groups them with the ones which are next to a selected element and the others
         * it is useful when moving multiple elements in the DOM
         */
        getDomMotionSort(selection, element, movementX, movementY) {
            const motion = this.getDomMotion(selection, element, movementX, movementY);
            return motion === 'up' ? -1
                : motion === 'down' ? 1
                    : 0;
        }
        /**
         * get the motion an element is supposed to have in the dom
         * if the element is supposed to go up but has another selected element above it, it will not move
         * if an element is supposed to go up but it is the top element, it will not move
         * same rules for going down
         */
        getDomMotion(selection, element, movementX, movementY) {
            return (movementX > 0 || movementY > 0) && element.nextElementSibling && !selection.find(s => s.el === element.nextElementSibling) ? 'down'
                : (movementX < 0 || movementY < 0) && element.previousElementSibling && !selection.find(s => s.el === element.previousElementSibling) ? 'up'
                    : '';
        }
        /**
         * move an element up, down, left, right
         * changes the top or left properties or the position in the dom
         * depending on the positionning of the element (static VS absolute/relative...)
         */
        move(movementX, movementY) {
            const selection = this.store.getState().selectables
                .filter(s => s.selected && this.hooks.isDraggable(s.el));
            const updated = selection
                .sort((s1, s2) => this.getDomMotionSort(selection, s2.el, movementX, movementY) - this.getDomMotionSort(selection, s1.el, movementX, movementY))
                .map(selectable => {
                if (selectable.metrics.position === 'static') {
                    // move the element in the dom
                    const element = selectable.el;
                    switch (this.getDomMotion(selection, element, movementX, movementY)) {
                        case 'up':
                            element.parentNode.insertBefore(element, element.previousElementSibling);
                            break;
                        case 'down':
                            element.parentNode.insertBefore(element.nextElementSibling, element);
                            break;
                        default:
                            // nothing happened
                            return null;
                    }
                    // element was moved in the dom => update metrics
                    selectable.dropZone = {
                        parent: element.parentNode,
                    };
                    return Object.assign(Object.assign({}, selectable), { metrics: DomMetrics.getMetrics(selectable.el) });
                }
                return Object.assign(Object.assign({}, selectable), { metrics: Object.assign(Object.assign({}, selectable.metrics), { clientRect: Object.assign(Object.assign({}, selectable.metrics.clientRect), { top: selectable.metrics.clientRect.top + movementY, left: selectable.metrics.clientRect.left + movementX, bottom: selectable.metrics.clientRect.bottom + movementY, right: selectable.metrics.clientRect.right + movementX }), computedStyleRect: Object.assign(Object.assign({}, selectable.metrics.computedStyleRect), { top: selectable.metrics.computedStyleRect.top + movementY, left: selectable.metrics.computedStyleRect.left + movementX, bottom: selectable.metrics.computedStyleRect.bottom + movementY, right: selectable.metrics.computedStyleRect.right + movementX }) }) });
            })
                .filter(s => !!s);
            this.store.dispatch(SelectableState_1.updateSelectables(updated));
            const domChanged = updated.filter(s => !!s.dropZone);
            if (domChanged.length > 0) {
                if (this.hooks.onDrop)
                    this.hooks.onDrop(domChanged);
            }
        }
    }
    exports.Keyboard = Keyboard;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiS2V5Ym9hcmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdHMvS2V5Ym9hcmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztJQVNBLE1BQU0sYUFBYSxHQUFHLENBQUMsQ0FBQztJQUN4QixNQUFNLG1CQUFtQixHQUFHLENBQUMsQ0FBQztJQUM5QixNQUFNLGlCQUFpQixHQUFHLEVBQUUsQ0FBQztJQUU3QixNQUFhLFFBQVE7UUFDbkIsWUFBb0IsR0FBVyxFQUFVLEtBQWlCLEVBQVUsS0FBWTtZQUE1RCxRQUFHLEdBQUgsR0FBRyxDQUFRO1lBQVUsVUFBSyxHQUFMLEtBQUssQ0FBWTtZQUFVLFVBQUssR0FBTCxLQUFLLENBQU87WUFReEUsbUJBQWMsR0FBc0IsRUFBRSxDQUFDO1lBUDdDLGdDQUFnQztZQUNoQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FDdEIsaUJBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBZ0IsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNwRSxpQkFBUSxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFnQixFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQ2xFLENBQUM7UUFDSixDQUFDO1FBR0QsT0FBTztZQUNMLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN4QyxDQUFDO1FBRUQ7O1dBRUc7UUFDSyxTQUFTLENBQUMsQ0FBZ0I7WUFDaEMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQztZQUNsQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFxQixDQUFDO1lB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