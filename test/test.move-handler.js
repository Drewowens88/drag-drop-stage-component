require("babel-polyfill");
var Polyfill = require('../src/js/Polyfill').Polyfill;
Polyfill.patchWindow(window);

var assert = require('assert');

describe('MoveHandler', function() {

  var MoveHandler;
  var elem1;
  var elem2;
  var elem3;

  before(function () {
    MoveHandler = require('../src/js/MoveHandler').MoveHandler;
    document.head.innerHTML = `<style>
      .droppable {
        width: 100px;
        height: 100px;
        border: 1px solid;
      }
      .selectable {
        min-width: 10px;
        min-height: 10px;
        border: 1px solid red;
      }
    </style>`;

    document.body.innerHTML = `
      <div class="droppable" id="container1">
        <div class="selectable draggable" id="elem1"></div>
        <div class="selectable draggable" id="elem2"></div>
        <div class="selectable draggable" id="elem3"></div>
      </div>
      <div class="droppable" id="container2"></div>
    `;

    elem1 = document.querySelector('#elem1');
    elem2 = document.querySelector('#elem2');
    elem3 = document.querySelector('#elem3');
  });

  it('should move an absolute element in the dom', function() {
    elem1.style.position = 'absolute';
    var handler = new MoveHandler([elem1], document, (el) => el.classList.contains('droppable'));
    handler.update(10, 10, 50, 150);
    assert.equal(elem1.style.transform, 'translate(10px, 10px)');
    assert.equal(handler.elementsData[0].destination.parent.id, 'container2');
    handler.release();
    elem1.style.position = '';
  });

  it('should move an element in the flow', function() {
    var handler = new MoveHandler([elem1], document, (el) => el.classList.contains('droppable'));
    handler.update(10, 10, 50, 150);
    assert.equal(elem1.style.transform, 'translate(10px, 10px)');
    assert.equal(handler.elementsData[0].destination.parent.id, 'container2');
    handler.release();
    assert.equal(elem1.style.transform, '');
    assert.equal(elem1.style.left, '10px', 'left is supposed to be 10px');
    assert.equal(elem1.style.top, '10px', 'top is supposed to be 10px');
  });

  it('should move a positioned element and one in the flow', function() {
    elem1.style.position = 'absolute';
    var handler = new MoveHandler([elem1, elem2], document, (el) => el.classList.contains('droppable'));
    handler.update(10, 10, 50, 150);
    assert.equal(elem1.style.transform, 'translate(10px, 10px)');
    assert.equal(elem2.style.transform, 'translate(10px, 10px)');
    assert.equal(elem3.style.transform, undefined);
    assert.equal(handler.elementsData[0].destination.parent.id, 'container2');
    assert.equal(handler.elementsData[1].destination.parent.id, 'container2');
    handler.release();
    elem1.style.position = '';
  });

  it('should find 1 dropzone at (10, 10) while dragging elem1', function() {
    var handler = new MoveHandler([elem1], document, (el) => el.classList.contains('droppable'));
    var dropzones = handler.findDroppablesUnderMouse(10, 10);
    assert.equal(dropzones.length, 1);
    assert.equal(dropzones instanceof Array, true);
    assert.equal(dropzones.indexOf(elem1) >= 0, false);
  });
});
