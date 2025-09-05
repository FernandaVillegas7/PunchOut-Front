(function($) {

    $.fn.BSerializeToJson = function(options) {

        return $(this).serializeObject(options);
    }

    $.fn.serializeObject = function(options) {

        let defaults = {
            empty: true,
            boolean: false,
            disabled: false
        };

        let settings = $.extend(defaults, options);

        let self = this,
            json = {},
            push_counters = {},
            patterns = {
                "validate": /^[a-zA-Z][a-zA-Z0-9_]*(?:\[(?:\d*|[a-zA-Z0-9_]+)\])*$|(.[a-zA-Z0-9]+)/,
                "key": /[a-zA-Z0-9_]+|(?=\[\])|(?=\.\.)/g,
                "push": /^$/,
                "fixed": /^\d+$/,
                "named": /^[a-zA-Z0-9_]+$/
            };


        this.build = function(base, key, value) {
            base[key] = value;
            return base;
        };

        this.push_counter = function(key) {
            if (push_counters[key] === undefined) {
                push_counters[key] = 0;
            }
            return push_counters[key]++;
        };

        let checkbox = [];
        let numbers2 = [];

        if (settings.boolean) {

            if ($(this).is("form")) {

                $("input[type=checkbox]", this).each(function() {

                    checkbox.push({ name: this.name, value: ($(this).is(":checked") ? "on" : "false") });
                });

            } else {

                $(this).each(function() {

                    if ($(this).is("[type=checkbox]"))
                        checkbox.push({ name: this.name, value: ($(this).is(":checked") ? "on" : "false") });
       

                    if ($(this).is("[type=text].money")) {

                        let v = $(this).val();

                        if (v != null && v.length)
                            v = v.replace("$", "").replace(/,/gi, "");

                        numbers2.push({ name: this.name, value: v });
                    }
                });
            }
        }

        if (settings.disabled) {

            if ($(this).is("form")) {

                $("[name]:disabled", this).each(function() {

                    if ($(this).is("[type=checkbox]"))
                        checkbox.push({ name: this.name, value: ($(this).is(":checked") ? "on" : "false") });
                    else
                        checkbox.push({ name: this.name, value: $(this).val() });
                });

                $("input[type='text'].money", this).each(function() {

                    let v = $(this).val();

                    if (v != null && v.length)
                        v = v.replace("$", "").replace(/,/gi, "");

                    numbers2.push({ name: this.name, value: v });
                });

            } else {

                $(this).each(function() {

                    if ($(this).is(":disabled")) {
                        if ($(this).is("[type=checkbox]"))
                            checkbox.push({ name: this.name, value: ($(this).is(":checked") ? "on" : "false") });
                        else
                            checkbox.push({ name: this.name, value: $(this).val() });
                    }

                    if ($(this).is("[type=text].money")) {

                        let v = $(this).val();

                        if (v != null && v.length)
                            v = v.replace("$", "").replace(/,/gi, "");

                        numbers2.push({ name: this.name, value: v });
                    }
                });
            }
        }

        $.each($.merge($.merge($(this).serializeArray(), checkbox),numbers2),
            function() {

                if (this.name && this.name != "__proto__") {


                    if (settings.boolean && this.value === "on") {

                        this.value = "true";
                    }

                    // skip invalid keys
                    if (!patterns.validate.test(this.name)) {

                        console.log("not matched!!", this.name);
                        return;
                    }
                    let k,
                        keys = this.name.match(patterns.key),
                        merge = this.value,
                        reverse_key = this.name;

                    if (!settings.empty && (this.value == null || !this.value.length))
                        return;

                    if (settings.boolean && (this.value === "true" || this.value === "false")) {

                        merge = (this.value === "true");
                    }

                    while ((k = keys.pop()) !== undefined) {


                        // adjust reverse_key
                        reverse_key = reverse_key.replace(new RegExp("\\[" + k + "\\]$"), '')
                            .replace(new RegExp("\\." + k + "\\.$"), '');

                        // push
                        if (k.match(patterns.push)) {


                            merge = self.build([], self.push_counter(reverse_key), merge);
                        }
                        // fixed
                        else if (k.match(patterns.fixed)) {
                            merge = self.build([], k, merge);
                        }
                        // named
                        else if (k.match(patterns.named)) {
                            merge = self.build({}, k, merge);
                        }


                    }
                    json = $.extend(true, json, merge);
                }
            });

        return json;
    };

})(jQuery);


(function($) {

    $.BAgregarValores = function(options) {

        let defaults = {
            data: {},
            elements: null
        };

        let settings = $.extend(defaults, options);


        return AddDataElement(settings.data, settings.elements);
    }


})(jQuery);

function AddDataElement(data, elements) {

    const v = jQuery.fn.jquery;

    if (data == null || elements == null) return;

    let auxPrm = $.param(data);
    
    if (["1.11.3"].includes(`${v}`)) {

       auxPrm = auxPrm.replaceAll("+", "%20");
    }


    const parameter = auxPrm.split("&");
  

    if ($(elements).is("form"))
        elements = elements.find("input, select, textarea, [name]");

    if (elements == null) return;

    elements.each(function() {

        let elemento = $(this);

        for (let i = 0; i < parameter.length; i++) {

            let d = parameter[i].split("=");

            let key = decodeURIComponent(d[0]);
            let value = decodeURIComponent(d[1]);

            if (elemento.attr("name") === (key) || elemento.attr("name") === _parseName(key)) {

                parameter.splice(i, 1);

                _addElementValue(elemento, value, data);

                if ($(elemento).is("[class*='v-confirm']")) {

                    let input_confirm = $("#" + $(elemento).attr("class").split("v-confirm(")[1].split(")")[0]);

                    _addElementValue(input_confirm, p, data);

                    $(elemento).change();

                } else if ($(elemento).is("[autochange]")) {

                    $(elemento).change();
                }

                break;
            }
        }

    });

}

function _parseName(s) {

    let x = s.replace(/(?=\[[a-zA-Z\d]*[^\]][^\[]*\])/gi, '&').split('&');

    for (let i in x) {
        if (x.hasOwnProperty(i)) {

            let patt = new RegExp(/\[[0-9]*\]/);

            if (!patt.test(x[i])) {
                s = s.replace(x[i], x[i].replace("[", ".").replace("]", ""));
            }
        }
    }

    return s;
}

function _addElementValue(el, value, dataFull) {

    if ($(el).is("[render]")) {

        let fRender = $(el).attr("render");

        if (window) {

            let _auxF = fRender.split(".");

            let _p = null;

            $.each(_auxF,
                function(i, o) {

                    if (i === 0) {
                        if (window[o] != undefined) {
                            _p = window[o];
                        }
                    } else {

                        if (_p[o] != undefined) {
                            _p = _p[o];
                        }
                    }

                    if (_p && typeof _p === 'function') {
                        value= _p(value, dataFull);
                    }
                });
        }
    }

    if (typeof value === "string" || value instanceof String) {


        
        if (value.indexOf("/Date(") > -1) {

            let f = value.ToDateTime();

            if ($(el).is(".fecha")) {

                let d = $(el).parent().data("DateTimePicker");

                if (d != undefined) {

                    if (f instanceof Date) {

                        $(el).val(moment(f).format(d.format()));
                    }

                    return;
                }
            }

            value = f;

            let format = $(el).attr("format");
            if (format != undefined) {
                value = moment(f).format(format);
            }
        } else if ($.isNumeric(value)) {

            let step2 = $(el).attr("step");

            if (step2 != undefined && !$(el).is("[type='number']")) {

                value = value.ToNumber(step2, step2);
            }

            if ($(el).is(".money")) {

                value = value.ToCurrency();
            }


        }

    } 
    if ($(el).is(".is-money")) {

        value = value.ToCurrency();
    }


    let tiposVal = ["input", "select", "textarea"];
    let tipoElemento = el[0].tagName;

    if (el.is("[value-inverse]") && el.prop("type").toLowerCase() === "checkbox") {
        value = !value.ToBoolean();
    }


    if ($.inArray(tipoElemento.toLowerCase(), tiposVal) > -1) {


        if (tipoElemento.toLowerCase() === "input") {


            let tipo = el.prop("type").toLowerCase();


            switch (tipo) {
            case "radio":

                $("[name='" + el.prop("name") + "'][value='" + value + "']")
                    .prop("checked", true);
                break;
            case "checkbox":

                el.prop("checked", value.ToBoolean());

                if (el.checkbox != undefined)
                    el.checkbox(value.ToBoolean() ? "check" : "uncheck");
                break;
            default:


                el.val(value);
                break;
            }
        } else {

            el.val(value);
        }

    } else {

        try {

            console.log(value);



            let rp = (value || "").toString().replace(/(?:\r\n|\r|\n)/g, "<br>");

            el.html(rp);
        }
        catch (e) {

            console.error(e);
        }

        
    }


}
