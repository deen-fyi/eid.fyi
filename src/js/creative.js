const DAY_KEY = 'day';
var FITR_NAME = 'Fitr';
var ADHA_NAME = 'Adha';
var DEFAULT_DAY = ADHA_NAME;
var params = new URLSearchParams(location.search);

$(document).ready(function() {
	if (params.has(DAY_KEY)) {
		var dayValue = params.get(DAY_KEY);

		if (dayValue === FITR_NAME && dayValue !== DEFAULT_DAY) {
			enableFitr();
		} else if (dayValue === ADHA_NAME && dayValue !== DEFAULT_DAY) {
			enableAdha();
		} else {
			params.delete(DAY_KEY);
			window.history.replaceState({}, '', `${location.pathname}?${params}`);
		}
	}

	$('#adhaBtn').click(function(e) {
        enableAdha();
    });

    $('#fitrBtn').click(function(e) {
        enableFitr();
    });
});

function enableAdha() {
	$('#fitrBtn').removeClass('active');
	$('#adhaBtn').addClass('active');
	params.set(DAY_KEY, ADHA_NAME);
	window.history.replaceState({}, '', `${location.pathname}?${params}`);
	$(".fitr").css('display','none');
	$(".adha").css('display','block');
}

function enableFitr() {
	$('#adhaBtn').removeClass('active');
	$('#fitrBtn').addClass('active');
	params.set(DAY_KEY, FITR_NAME);
	window.history.replaceState({}, '', `${location.pathname}?${params}`);
	$(".adha").css('display','none');
	$(".fitr").css('display','block');
}