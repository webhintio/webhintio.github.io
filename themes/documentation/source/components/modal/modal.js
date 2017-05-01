(function () {
	'use strict';
	var originator = null;
	var modal = null;
	var focusableArray;
	var focusIndex;

	// Assumption: only one modal open at a time. Assume every button dismisses modal
	var closeModal = function () {
		modal.setAttribute('aria-hidden', 'true');
		modal = null;

		originator.focus();
		originator = null;
	};

	var toArray = function (collection) {
		var array = [];
		for (var i = 0, li = collection.length; i < li; i++) {
			array.push(collection[i]);
		}
		return array;
	};

	var orderFocusableArray = function () {
		focusableArray = focusableArray.sort(function (item1, item2) {
			var x1 = parseInt(item1.tabIndex, 10);
			var x2 = parseInt(item2.tabIndex, 10);
			//elements with tabindex=0 go to the end of the array
			if (x1 === 0 || x2 === 0) {
				return x2 - x1;
			}
			return x1 - x2;
		});
	};

	var showModal = function () {
		var modalDialog;
		// remember el that opened dialog so can return focus
		/* eslint-disable no-invalid-this, consistent-this*/
		//TODO: this "this" is probably wrong
		originator = this;
		/* eslint-enable no-invalid-this, consistent-this*/

		modal = document.getElementById(originator.getAttribute('data-modal'));
		modal.setAttribute('aria-hidden', 'false');

		focusableArray = toArray(modal.querySelectorAll('a, input, button, [tabindex]:not([tabindex="-1"])'));

		orderFocusableArray();

		// focus the modal dialog)
		modalDialog = modal.querySelector('.modal-dialog');
		focusIndex = focusableArray.indexOf(modalDialog);
		modalDialog.focus();
	};

	var tabFocus = function (e) {
		e.preventDefault();
		if (focusableArray.length === 1) {
			focusableArray[0].focus();
		} else if (focusableArray.length > 1) {
			if (e.shiftKey) {
				focusIndex--;
			} else {
				focusIndex++;
			}

			if (focusIndex < 0) {
				focusIndex = focusableArray.length - 1;
			} else if (focusIndex > focusableArray.length - 1) {
				focusIndex = 0;
			}

			focusableArray[focusIndex].focus();
		}
	};

	var bindKeys = function (e) {
		if (modal) {
			if (e.keyCode === 27) {
				closeModal();
			} else if (e.keyCode === 9) {
				tabFocus(e);
			}
		}
	};

	var onShowHideModal = function (e) {
		var element = e.target;

		if (element.getAttribute('data-modal') !== null) {
			showModal.apply(element);
		} else if (element.tagName && element.tagName.toLowerCase() === 'button' && element.parentNode && element.parentNode.className.indexOf('modal__footer') !== -1) {
			closeModal();
		}
	};

	var registerEvents = function () {
		window.addEventListener('click', onShowHideModal, false);

		//Hook up keyboard events
		document.addEventListener('keydown', bindKeys, false);
	};

	registerEvents();
}());