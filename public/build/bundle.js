
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if (typeof $$scope.dirty === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function set_store_value(store, ret, value = ret) {
        store.set(value);
        return ret;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.18.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    var semverCompare = function cmp (a, b) {
        var pa = a.split('.');
        var pb = b.split('.');
        for (var i = 0; i < 3; i++) {
            var na = Number(pa[i]);
            var nb = Number(pb[i]);
            if (na > nb) return 1;
            if (nb > na) return -1;
            if (!isNaN(na) && isNaN(nb)) return 1;
            if (isNaN(na) && !isNaN(nb)) return -1;
        }
        return 0;
    };

    function logger(...obj) {
      if (window.debugMode) {
        console.log(...obj);
      }
    }

    class ConfigurationObject {
      constructor({
        faderBlink = true,
        accelBlink = true,
        controllerFlip = false,
        deviceId = 0,
        i2cMaster = false,
        midiThru = false,
        midiMode = true,
        dxMode = false,
        pageNumber = 0,
        fadermin = 0,
        fadermax = 4096,
        firmwareVersion = "unknown",
        usbControls = [],
        trsControls = [],
        usbButtons = [],
        trsButtons = [],
      }) {
        this.faderBlink = faderBlink;
        this.accelBlink = accelBlink;
        this.controllerFlip = controllerFlip;
        this.deviceId = deviceId;
        this.firmwareVersion = firmwareVersion;
        this.i2cMaster = i2cMaster;
        this.midiThru = midiThru;
        this.midiMode = midiMode;
        this.dxMode = dxMode;
        this.pageNumber = pageNumber;
        this.fadermin = fadermin;
        this.fadermax = fadermax;
        this.usbControls = usbControls;
        this.trsControls = trsControls;
        this.usbButtons = usbButtons;
        this.trsButtons = trsButtons;
      }

      isEquivalent(otherConfig) {
        let optionEquivalents =
          this.faderBlink == otherConfig.faderBlink &&
          this.accelBlink == otherConfig.accelBlink &&
          this.controllerFlip == otherConfig.controllerFlip &&
          this.midiThru == otherConfig.midiThru &&
          this.midiMode == otherConfig.midiMode &&
          this.dxMode == otherConfig.dxMode &&
          this.pageNumber == otherConfig.pageNumber;

        if ("i2cMaster" in this || "i2cMaster" in otherConfig) {
          optionEquivalents =
            optionEquivalents && this.i2cMaster == otherConfig.i2cMaster;
        }

        if ("fadermax" in this || "fadermax" in otherConfig) {
          optionEquivalents =
            optionEquivalents &&
            this.fadermax == otherConfig.fadermax &&
            this.fadermin == otherConfig.fadermin;
        }

        let usbEquivalent = true;
        let trsEquivalent = true;

        this.usbControls.forEach((control, i) => {
          let otherControl = otherConfig.usbControls[i];
          if (
            control.channel != otherControl.channel ||
            control.cc != otherControl.cc
          ) {
            usbEquivalent = false;
          }
        });

        this.trsControls.forEach((control, i) => {
          let otherControl = otherConfig.trsControls[i];
          if (
            control.channel != otherControl.channel ||
            control.cc != otherControl.cc
          ) {
            usbEquivalent = false;
          }
        });

        let usbButtonEquivalent = true;
        let trsButtonEquivalent = true;
        this.usbButtons.forEach((control, i) => {
          let otherControl = otherConfig.usbButtons[i];
          if (
            control.channel != otherControl.channel ||
            control.mode != otherControl.mode ||
            (control.paramA != otherControl.paramA) |
              (control.paramB != otherControl.paramB)
          ) {
            usbButtonEquivalent = false;
          }
        });
        this.trsButtons.forEach((control, i) => {
          let otherControl = otherConfig.trsButtons[i];
          if (
            control.channel != otherControl.channel ||
            control.mode != otherControl.mode ||
            (control.paramA != otherControl.paramA) |
              (control.paramB != otherControl.paramB)
          ) {
            usbButtonEquivalent = false;
          }
        });

        return (
          optionEquivalents &&
          usbEquivalent &&
          trsEquivalent &&
          usbButtonEquivalent &&
          trsButtonEquivalent
        );
      }

      toSysexArray() {
        let array = Array.from({ length: 116 }, (v) => 0);

        array[0] = this.deviceId;
        array[1] = this.firmwareArray()[0];
        array[2] = this.firmwareArray()[1];
        array[3] = this.firmwareArray()[2];

        array[4] = this.faderBlink ? 1 : 0;
        array[5] = this.accelBlink ? 1 : 0;
        array[6] = this.controllerFlip ? 1 : 0;

        array[7] = this.i2cMaster;

        let faderminMSB = this.fadermin >> 7;
        let faderminLSB = this.fadermin - (faderminMSB << 7);
        array[8] = faderminLSB;
        array[9] = faderminMSB;
        let fadermaxMSB = this.fadermax >> 7;
        let fadermaxLSB = this.fadermax - (fadermaxMSB << 7);
        array[10] = fadermaxLSB;
        array[11] = fadermaxMSB;
        array[12] = this.midiThru ? 1 : 0;
        array[13] = this.midiMode ? 1 : 0;
        array[14] = this.dxMode ? 1 : 0;
        array[15] = this.pageNumber;

        let usbChannelOffset = 20;
        let trsChannelOffset = 36;
        let usbControlOffset = 52;
        let trsControlOffset = 68;

        this.usbControls.forEach((control, index) => {
          array[index + usbChannelOffset] = control.channel;
          array[index + usbControlOffset] = control.cc;
        });
        this.trsControls.forEach((control, index) => {
          array[index + trsChannelOffset] = control.channel;
          array[index + trsControlOffset] = control.cc;
        });

        let usbButtonChannelOffset = 84;
        let trsButtonChannelOffset = 88;
        let usbButtonModeOffset = 92;
        let trsButtonModeOffset = 96;
        let usbButtonParamAOffset = 100;
        let trsButtonParamAOffset = 104;
        let usbButtonParamBOffset = 108;
        let trsButtonParamBOffset = 112;

        this.usbButtons.forEach((control, index) => {
          array[index + usbButtonChannelOffset] = control.channel;
          array[index + usbButtonModeOffset] = control.mode;
          array[index + usbButtonParamAOffset] = control.paramA;
          array[index + usbButtonParamBOffset] = control.paramB;
        });

        this.trsButtons.forEach((control, index) => {
          array[index + trsButtonChannelOffset] = control.channel;
          array[index + trsButtonModeOffset] = control.mode;
          array[index + trsButtonParamAOffset] = control.paramA;
          array[index + trsButtonParamBOffset] = control.paramB;
        });

        return array;
      }

      toDeviceOptionsSysexArray() {
        const fullArray = this.toSysexArray();
        return fullArray.slice(4, 20);
      }

      toUSBOptionsSysexArray() {
        const fullArray = this.toSysexArray();
        const channels = fullArray.slice(20, 36);
        const ccs = fullArray.slice(52, 68);
        return channels.concat(ccs);
      }

      toTRSOptionsSysexArray() {
        const fullArray = this.toSysexArray();
        const channels = fullArray.slice(36, 52);
        const ccs = fullArray.slice(68, 84);
        return channels.concat(ccs);
      }

      toJsonString() {
        let o = ConfigurationObject.clone(this);
        // truncate all controllers to length $length;
        let controllerCount = this.device().controlCount;
         let buttonsCount = this.device().buttonCount;

        o.usbControls = o.usbControls.splice(0, controllerCount);
        o.usbControls.forEach((c) => delete c.val);

        o.trsControls = o.trsControls.splice(0, controllerCount);
        o.usbButtons = o.usbButtons.splice(0, buttonsCount);
        o.trsButtons = o.trsButtons.splice(0, buttonsCount);
        

        return JSON.stringify(o, false, 2);
      }

      isNewConfigInvalid(json) {
        if (json.deviceId != this.deviceId) {
          return `Cannot update - this data file is for a ${
        ConfigurationObject.devices[json.deviceId].name
      }, but you are trying to install it on a ${this.device().name} `;
        }

        // if(json.firmwareVersion != this.firmwareVersion) {
        //   return(`Cannot update - this data file is for firmware version ${json.firmwareVersion}, but you are trying to install it on a device running firmware version ${this.firmwareVersion}`);
        // }

        return false;
      }

      updateFromJson(json) {

        Object.keys(json).forEach((key) => {
        
          if (key != 'pageNumber') { // do not import the page number key when loading from json 
          this[key] = json[key];
          }
        });

        return this;
      }

      device() {
        return ConfigurationObject.devices[this.deviceId];
      }

      firmwareArray() {
        let arr = this.firmwareVersion.trim().split(".");
        return arr.map((n) => parseInt(n));
      }

      static clone(obj) {
        let newObj = new ConfigurationObject({
          faderBlink: obj.faderBlink,
          accelBlink: obj.accelBlink,
          controllerFlip: obj.controllerFlip,
          usbControls: [],
          trsControls: [],
          deviceId: obj.deviceId,
          firmwareVersion: obj.firmwareVersion,
          i2cMaster: obj.i2cMaster,
          fadermin: obj.fadermin,
          fadermax: obj.fadermax,
          midiThru: obj.midiThru,
          midiMode: obj.midiMode,
          dxMode: obj.dxMode,
          pageNumber: obj.pageNumber,
        });

        obj.usbControls.forEach((control, i) => {
          newObj.usbControls[i] = { ...control };
        });
        obj.trsControls.forEach((control, i) => {
          newObj.trsControls[i] = { ...control };
        });

        obj.usbButtons.forEach((control, i) => {
          newObj.usbButtons[i] = { ...control };
        });

        obj.trsButtons.forEach((control, i) => {
          newObj.trsButtons[i] = { ...control };
        });

        return newObj;
      }

      static returnConfigHashFromSysex(data) {
        logger("Generating config from", data);
        let offset = 8;

        let deviceId = data[5];
        let firmwareVersion = data[6] + "." + data[7] + "." + data[8];

        let faderBlink = data[1 + offset];
        let accelBlink = data[2 + offset];
        let controllerFlip = data[3 + offset];

        let i2cMaster = data[4 + offset] == 1;

        let faderminLSB = data[5 + offset];
        let faderminMSB = data[6 + offset];
        let fadermaxLSB = data[7 + offset];
        let fadermaxMSB = data[8 + offset];

        let fadermin = (faderminMSB << 7) + faderminLSB;
        let fadermax = (fadermaxMSB << 7) + fadermaxLSB;

        let midiThru = data[9 + offset];
        let midiMode = data[10 + offset];
        let dxMode = data[11 + offset];

        let pageNumber = data[12 + offset];
        let usbControls = [];
        let trsControls = [];
        let usbButtons = [];
        let trsButtons = [];

        data.slice(17 + offset, 33 + offset).forEach((chan, i) => {
          if (chan != 0x7f) {
            usbControls[i] = {
              channel: chan,
            };
          }
        });

        data.slice(33 + offset, 49 + offset).forEach((chan, i) => {
          if (chan != 0x7f) {
            trsControls[i] = {
              channel: chan,
            };
          }
        });

        data.slice(49 + offset, 65 + offset).forEach((cc, i) => {
          if (cc != 0x7f) {
            usbControls[i].cc = cc;
          }
        });

        data.slice(65 + offset, 81 + offset).forEach((cc, i) => {
          if (cc != 0x7f) {
            trsControls[i].cc = cc;
          }
        });

        data.slice(81 + offset, 85 + offset).forEach((chan, i) => {
          if (chan != 0x7f) {
            usbButtons[i] = {
              channel: chan,
            };
          }
        });

        data.slice(85 + offset, 89 + offset).forEach((chan, i) => {
          if (chan != 0x7f) {
            trsButtons[i] = {
              channel: chan,
            };
          }
        });

        data.slice(89 + offset, 93 + offset).forEach((mod, i) => {
          if (mod != 0x7f) {
            usbButtons[i].mode = mod;
          }
        });

        data.slice(93 + offset, 97 + offset).forEach((mod, i) => {
          if (mod != 0x7f) {
            trsButtons[i].mode = mod;
          }
        });

        data.slice(97 + offset, 101 + offset).forEach((par, i) => {
          if (par != 0x7f) {
            usbButtons[i].paramA = par;
          }
        });

        data.slice(101 + offset, 105 + offset).forEach((par, i) => {
          if (par != 0x7f) {
            trsButtons[i].paramA = par;
          }
        });

        data.slice(105 + offset, 109 + offset).forEach((par, i) => {
          if (par != 0x7f) {
            usbButtons[i].paramB = par;
          }
        });

        data.slice(109 + offset, 113 + offset).forEach((par, i) => {
          if (par != 0x7f) {
            trsButtons[i].paramB = par;
          }
        });

        usbControls.forEach((c) => (c.val = 0));

        return new ConfigurationObject({
          faderBlink,
          accelBlink,
          controllerFlip,
          midiThru,
          midiMode,
          dxMode,
          usbControls,
          trsControls,
          deviceId,
          firmwareVersion,
          i2cMaster,
          fadermin,
          fadermax,
          usbButtons,
          trsButtons,
          midiThru,
          midiMode,
          dxMode,
          pageNumber,
        });
      }
    }

    ConfigurationObject.devices = [
      {
        name: "unknown",
        controlCount: 0,
        capabilities: {},
      },
      {
        name: "Oxion development board",
        controlCount: 4,
        capabilities: {
          led: true,
        },
      },
      {
        name: "16n",
        controlCount: 16,
        capabilities: {
          i2c: true,
          led: true,
        },
      },
      {
        name: "16n (LC)",
        controlCount: 16,
        capabilities: {
          i2c: true,
          led: true,
        },
        sendShortMessages: true,
      },
      {
        name: "Music Thing 8mu",
        controlCount: 16,
        buttonCount: 4,
        capabilities: {
          i2c: false,
          led: true,
        },
      },
    ];

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const configuration = writable(null);
    const editConfiguration = writable(null);
    const midiInputs = writable([]);
    const midiOutputs = writable([]);
    const selectedMidiInput = writable(null);
    const selectedMidiOutput = writable(null);
    const webMidiEnabled = writable(null);
    const editMode = writable(null);

    class ImportExport {
      static import(currentEditConfig, currentConfig, editConfigStore) {
        let fileInputNode = document.createElement("input");
        fileInputNode.setAttribute("type", "file");
        fileInputNode.setAttribute("id", "uploadedConfig");
        fileInputNode.setAttribute("onchange", "window.handleFiles(this.files)");

        window.handleFiles = (files) => {
          if (files.length > 0) {
            let newConfig = files[0];
            const reader = new FileReader();

            reader.addEventListener("load", (e) => {
              const newConfigData = JSON.parse(reader.result);
              const invalidConfig =
                currentEditConfig.isNewConfigInvalid(newConfigData);
              if (invalidConfig) {
                alert(invalidConfig);
                return;
              } else {
                editConfigStore.update((old) =>
                  currentEditConfig.updateFromJson(newConfigData)
                );
                if (currentEditConfig.isEquivalent(currentConfig)) {
                  alert(
                    "Imported configuration is identical to currently loaded configuration; no changes to upload."
                  );
                } else {
                  alert(
                    "New configuration imported. Choose 'update controller' to import, or 'Cancel' to abort"
                  );
                }
              }
            });

            reader.readAsText(newConfig);

            window.handleFiles = null;
          }
        };

        fileInputNode.click();

        fileInputNode.remove();
      }

      static export(configObject) {
        let dataStr =
          "data:text/json;charset=utf-8," +
          encodeURIComponent(configObject.toJsonString());

        let downloadAnchorNode = document.createElement("a");
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute(
          "download",
          `${configObject.device().name}_page_${configObject.pageNumber + 1}_controller_config.json`
        );
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
      }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var webmidi_min = createCommonjsModule(function (module) {
    /*

    WebMidi v2.5.1

    WebMidi.js helps you tame the Web MIDI API. Send and receive MIDI messages with ease. Control instruments with user-friendly functions (playNote, sendPitchBend, etc.). React to MIDI input with simple event listeners (noteon, pitchbend, controlchange, etc.).
    https://github.com/djipco/webmidi


    The MIT License (MIT)

    Copyright (c) 2015-2019, Jean-Philippe Côté

    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
    associated documentation files (the "Software"), to deal in the Software without restriction,
    including without limitation the rights to use, copy, modify, merge, publish, distribute,
    sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all copies or substantial
    portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
    NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
    OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
    CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

    */


    !function(scope){function WebMidi(){if(WebMidi.prototype._singleton)throw new Error("WebMidi is a singleton, it cannot be instantiated directly.");(WebMidi.prototype._singleton=this)._inputs=[],this._outputs=[],this._userHandlers={},this._stateChangeQueue=[],this._processingStateChange=!1,this._midiInterfaceEvents=["connected","disconnected"],this._nrpnBuffer=[[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]],this._nrpnEventsEnabled=!0,this._nrpnTypes=["entry","increment","decrement"],this._notes=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],this._semitones={C:0,D:2,E:4,F:5,G:7,A:9,B:11},Object.defineProperties(this,{MIDI_SYSTEM_MESSAGES:{value:{sysex:240,timecode:241,songposition:242,songselect:243,tuningrequest:246,sysexend:247,clock:248,start:250,continue:251,stop:252,activesensing:254,reset:255,midimessage:0,unknownsystemmessage:-1},writable:!1,enumerable:!0,configurable:!1},MIDI_CHANNEL_MESSAGES:{value:{noteoff:8,noteon:9,keyaftertouch:10,controlchange:11,channelmode:11,nrpn:11,programchange:12,channelaftertouch:13,pitchbend:14},writable:!1,enumerable:!0,configurable:!1},MIDI_REGISTERED_PARAMETER:{value:{pitchbendrange:[0,0],channelfinetuning:[0,1],channelcoarsetuning:[0,2],tuningprogram:[0,3],tuningbank:[0,4],modulationrange:[0,5],azimuthangle:[61,0],elevationangle:[61,1],gain:[61,2],distanceratio:[61,3],maximumdistance:[61,4],maximumdistancegain:[61,5],referencedistanceratio:[61,6],panspreadangle:[61,7],rollangle:[61,8]},writable:!1,enumerable:!0,configurable:!1},MIDI_CONTROL_CHANGE_MESSAGES:{value:{bankselectcoarse:0,modulationwheelcoarse:1,breathcontrollercoarse:2,footcontrollercoarse:4,portamentotimecoarse:5,dataentrycoarse:6,volumecoarse:7,balancecoarse:8,pancoarse:10,expressioncoarse:11,effectcontrol1coarse:12,effectcontrol2coarse:13,generalpurposeslider1:16,generalpurposeslider2:17,generalpurposeslider3:18,generalpurposeslider4:19,bankselectfine:32,modulationwheelfine:33,breathcontrollerfine:34,footcontrollerfine:36,portamentotimefine:37,dataentryfine:38,volumefine:39,balancefine:40,panfine:42,expressionfine:43,effectcontrol1fine:44,effectcontrol2fine:45,holdpedal:64,portamento:65,sustenutopedal:66,softpedal:67,legatopedal:68,hold2pedal:69,soundvariation:70,resonance:71,soundreleasetime:72,soundattacktime:73,brightness:74,soundcontrol6:75,soundcontrol7:76,soundcontrol8:77,soundcontrol9:78,soundcontrol10:79,generalpurposebutton1:80,generalpurposebutton2:81,generalpurposebutton3:82,generalpurposebutton4:83,reverblevel:91,tremololevel:92,choruslevel:93,celestelevel:94,phaserlevel:95,databuttonincrement:96,databuttondecrement:97,nonregisteredparametercoarse:98,nonregisteredparameterfine:99,registeredparametercoarse:100,registeredparameterfine:101},writable:!1,enumerable:!0,configurable:!1},MIDI_NRPN_MESSAGES:{value:{entrymsb:6,entrylsb:38,increment:96,decrement:97,paramlsb:98,parammsb:99,nullactiveparameter:127},writable:!1,enumerable:!0,configurable:!1},MIDI_CHANNEL_MODE_MESSAGES:{value:{allsoundoff:120,resetallcontrollers:121,localcontrol:122,allnotesoff:123,omnimodeoff:124,omnimodeon:125,monomodeon:126,polymodeon:127},writable:!1,enumerable:!0,configurable:!1},octaveOffset:{value:0,writable:!0,enumerable:!0,configurable:!1}}),Object.defineProperties(this,{supported:{enumerable:!0,get:function(){return "requestMIDIAccess"in navigator}},enabled:{enumerable:!0,get:function(){return void 0!==this.interface}.bind(this)},inputs:{enumerable:!0,get:function(){return this._inputs}.bind(this)},outputs:{enumerable:!0,get:function(){return this._outputs}.bind(this)},sysexEnabled:{enumerable:!0,get:function(){return !(!this.interface||!this.interface.sysexEnabled)}.bind(this)},nrpnEventsEnabled:{enumerable:!0,get:function(){return !!this._nrpnEventsEnabled}.bind(this),set:function(enabled){return this._nrpnEventsEnabled=enabled,this._nrpnEventsEnabled}},nrpnTypes:{enumerable:!0,get:function(){return this._nrpnTypes}.bind(this)},time:{enumerable:!0,get:function(){return performance.now()}}});}var wm=new WebMidi;function Input(midiInput){var that=this;this._userHandlers={channel:{},system:{}},this._midiInput=midiInput,Object.defineProperties(this,{connection:{enumerable:!0,get:function(){return that._midiInput.connection}},id:{enumerable:!0,get:function(){return that._midiInput.id}},manufacturer:{enumerable:!0,get:function(){return that._midiInput.manufacturer}},name:{enumerable:!0,get:function(){return that._midiInput.name}},state:{enumerable:!0,get:function(){return that._midiInput.state}},type:{enumerable:!0,get:function(){return that._midiInput.type}}}),this._initializeUserHandlers(),this._midiInput.onmidimessage=this._onMidiMessage.bind(this);}function Output(midiOutput){var that=this;this._midiOutput=midiOutput,Object.defineProperties(this,{connection:{enumerable:!0,get:function(){return that._midiOutput.connection}},id:{enumerable:!0,get:function(){return that._midiOutput.id}},manufacturer:{enumerable:!0,get:function(){return that._midiOutput.manufacturer}},name:{enumerable:!0,get:function(){return that._midiOutput.name}},state:{enumerable:!0,get:function(){return that._midiOutput.state}},type:{enumerable:!0,get:function(){return that._midiOutput.type}}});}WebMidi.prototype.enable=function(callback,sysex){this.enabled||(this.supported?navigator.requestMIDIAccess({sysex:sysex}).then(function(midiAccess){var promiseTimeout,events=[],promises=[];this.interface=midiAccess,this._resetInterfaceUserHandlers(),this.interface.onstatechange=function(e){events.push(e);};for(var inputs=midiAccess.inputs.values(),input=inputs.next();input&&!input.done;input=inputs.next())promises.push(input.value.open());for(var outputs=midiAccess.outputs.values(),output=outputs.next();output&&!output.done;output=outputs.next())promises.push(output.value.open());function onPortsOpen(){clearTimeout(promiseTimeout),this._updateInputsAndOutputs(),this.interface.onstatechange=this._onInterfaceStateChange.bind(this),"function"==typeof callback&&callback.call(this),events.forEach(function(event){this._onInterfaceStateChange(event);}.bind(this));}promiseTimeout=setTimeout(onPortsOpen.bind(this),200),Promise&&Promise.all(promises).catch(function(err){}).then(onPortsOpen.bind(this));}.bind(this),function(err){"function"==typeof callback&&callback.call(this,err);}.bind(this)):"function"==typeof callback&&callback(new Error("The Web MIDI API is not supported by your browser.")));},WebMidi.prototype.disable=function(){if(!this.supported)throw new Error("The Web MIDI API is not supported by your browser.");this.interface&&(this.interface.onstatechange=void 0),this.interface=void 0,this._inputs=[],this._outputs=[],this._nrpnEventsEnabled=!0,this._resetInterfaceUserHandlers();},WebMidi.prototype.addListener=function(type,listener){if(!this.enabled)throw new Error("WebMidi must be enabled before adding event listeners.");if("function"!=typeof listener)throw new TypeError("The 'listener' parameter must be a function.");if(!(0<=this._midiInterfaceEvents.indexOf(type)))throw new TypeError("The specified event type is not supported.");return this._userHandlers[type].push(listener),this},WebMidi.prototype.hasListener=function(type,listener){if(!this.enabled)throw new Error("WebMidi must be enabled before checking event listeners.");if("function"!=typeof listener)throw new TypeError("The 'listener' parameter must be a function.");if(!(0<=this._midiInterfaceEvents.indexOf(type)))throw new TypeError("The specified event type is not supported.");for(var o=0;o<this._userHandlers[type].length;o++)if(this._userHandlers[type][o]===listener)return !0;return !1},WebMidi.prototype.removeListener=function(type,listener){if(!this.enabled)throw new Error("WebMidi must be enabled before removing event listeners.");if(void 0!==listener&&"function"!=typeof listener)throw new TypeError("The 'listener' parameter must be a function.");if(0<=this._midiInterfaceEvents.indexOf(type))if(listener)for(var o=0;o<this._userHandlers[type].length;o++)this._userHandlers[type][o]===listener&&this._userHandlers[type].splice(o,1);else this._userHandlers[type]=[];else{if(void 0!==type)throw new TypeError("The specified event type is not supported.");this._resetInterfaceUserHandlers();}return this},WebMidi.prototype.toMIDIChannels=function(channel){var channels;if("all"===channel||void 0===channel)channels=["all"];else{if("none"===channel)return channels=[];channels=Array.isArray(channel)?channel:[channel];}return -1<channels.indexOf("all")&&(channels=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]),channels.map(function(ch){return parseInt(ch)}).filter(function(ch){return 1<=ch&&ch<=16})},WebMidi.prototype.getInputById=function(id){if(!this.enabled)throw new Error("WebMidi is not enabled.");id=String(id);for(var i=0;i<this.inputs.length;i++)if(this.inputs[i].id===id)return this.inputs[i];return !1},WebMidi.prototype.getOutputById=function(id){if(!this.enabled)throw new Error("WebMidi is not enabled.");id=String(id);for(var i=0;i<this.outputs.length;i++)if(this.outputs[i].id===id)return this.outputs[i];return !1},WebMidi.prototype.getInputByName=function(name){if(!this.enabled)throw new Error("WebMidi is not enabled.");for(var i=0;i<this.inputs.length;i++)if(~this.inputs[i].name.indexOf(name))return this.inputs[i];return !1},WebMidi.prototype.getOctave=function(number){if(null!=number&&0<=number&&number<=127)return Math.floor(Math.floor(number)/12-1)+Math.floor(wm.octaveOffset)},WebMidi.prototype.getOutputByName=function(name){if(!this.enabled)throw new Error("WebMidi is not enabled.");for(var i=0;i<this.outputs.length;i++)if(~this.outputs[i].name.indexOf(name))return this.outputs[i];return !1},WebMidi.prototype.guessNoteNumber=function(input){var output=!1;if(input&&input.toFixed&&0<=input&&input<=127?output=Math.round(input):0<=parseInt(input)&&parseInt(input)<=127?output=parseInt(input):("string"==typeof input||input instanceof String)&&(output=this.noteNameToNumber(input)),!1===output)throw new Error("Invalid input value ("+input+").");return output},WebMidi.prototype.noteNameToNumber=function(name){"string"!=typeof name&&(name="");var matches=name.match(/([CDEFGAB])(#{0,2}|b{0,2})(-?\d+)/i);if(!matches)throw new RangeError("Invalid note name.");var semitones=wm._semitones[matches[1].toUpperCase()],result=12*(parseInt(matches[3])+1-Math.floor(wm.octaveOffset))+semitones;if(-1<matches[2].toLowerCase().indexOf("b")?result-=matches[2].length:-1<matches[2].toLowerCase().indexOf("#")&&(result+=matches[2].length),result<0||127<result)throw new RangeError("Invalid note name or note outside valid range.");return result},WebMidi.prototype._updateInputsAndOutputs=function(){this._updateInputs(),this._updateOutputs();},WebMidi.prototype._updateInputs=function(){for(var i=0;i<this._inputs.length;i++){for(var remove=!0,updated=this.interface.inputs.values(),input=updated.next();input&&!input.done;input=updated.next())if(this._inputs[i]._midiInput===input.value){remove=!1;break}remove&&this._inputs.splice(i,1);}this.interface&&this.interface.inputs.forEach(function(nInput){for(var add=!0,j=0;j<this._inputs.length;j++)this._inputs[j]._midiInput===nInput&&(add=!1);add&&this._inputs.push(new Input(nInput));}.bind(this));},WebMidi.prototype._updateOutputs=function(){for(var i=0;i<this._outputs.length;i++){for(var remove=!0,updated=this.interface.outputs.values(),output=updated.next();output&&!output.done;output=updated.next())if(this._outputs[i]._midiOutput===output.value){remove=!1;break}remove&&this._outputs.splice(i,1);}this.interface&&this.interface.outputs.forEach(function(nOutput){for(var add=!0,j=0;j<this._outputs.length;j++)this._outputs[j]._midiOutput===nOutput&&(add=!1);add&&this._outputs.push(new Output(nOutput));}.bind(this));},WebMidi.prototype._onInterfaceStateChange=function(e){this._updateInputsAndOutputs();var event={timestamp:e.timeStamp,type:e.port.state};this.interface&&"connected"===e.port.state?"output"===e.port.type?event.port=this.getOutputById(e.port.id):"input"===e.port.type&&(event.port=this.getInputById(e.port.id)):event.port={connection:"closed",id:e.port.id,manufacturer:e.port.manufacturer,name:e.port.name,state:e.port.state,type:e.port.type},this._userHandlers[e.port.state].forEach(function(handler){handler(event);});},WebMidi.prototype._resetInterfaceUserHandlers=function(){for(var i=0;i<this._midiInterfaceEvents.length;i++)this._userHandlers[this._midiInterfaceEvents[i]]=[];},Input.prototype.on=Input.prototype.addListener=function(type,channel,listener){var that=this;if(void 0===channel&&(channel="all"),Array.isArray(channel)||(channel=[channel]),channel.forEach(function(item){if("all"!==item&&!(1<=item&&item<=16))throw new RangeError("The 'channel' parameter is invalid.")}),"function"!=typeof listener)throw new TypeError("The 'listener' parameter must be a function.");if(void 0!==wm.MIDI_SYSTEM_MESSAGES[type])this._userHandlers.system[type]||(this._userHandlers.system[type]=[]),this._userHandlers.system[type].push(listener);else{if(void 0===wm.MIDI_CHANNEL_MESSAGES[type])throw new TypeError("The specified event type is not supported.");if(-1<channel.indexOf("all")){channel=[];for(var j=1;j<=16;j++)channel.push(j);}this._userHandlers.channel[type]||(this._userHandlers.channel[type]=[]),channel.forEach(function(ch){that._userHandlers.channel[type][ch]||(that._userHandlers.channel[type][ch]=[]),that._userHandlers.channel[type][ch].push(listener);});}return this},Input.prototype.hasListener=function(type,channel,listener){var that=this;if("function"!=typeof listener)throw new TypeError("The 'listener' parameter must be a function.");if(void 0===channel&&(channel="all"),channel.constructor!==Array&&(channel=[channel]),void 0!==wm.MIDI_SYSTEM_MESSAGES[type]){for(var o=0;o<this._userHandlers.system[type].length;o++)if(this._userHandlers.system[type][o]===listener)return !0}else if(void 0!==wm.MIDI_CHANNEL_MESSAGES[type]){if(-1<channel.indexOf("all")){channel=[];for(var j=1;j<=16;j++)channel.push(j);}return !!this._userHandlers.channel[type]&&channel.every(function(chNum){var listeners=that._userHandlers.channel[type][chNum];return listeners&&-1<listeners.indexOf(listener)})}return !1},Input.prototype.removeListener=function(type,channel,listener){var that=this;if(void 0!==listener&&"function"!=typeof listener)throw new TypeError("The 'listener' parameter must be a function.");if(void 0===channel&&(channel="all"),channel.constructor!==Array&&(channel=[channel]),void 0!==wm.MIDI_SYSTEM_MESSAGES[type])if(void 0===listener)this._userHandlers.system[type]=[];else for(var o=0;o<this._userHandlers.system[type].length;o++)this._userHandlers.system[type][o]===listener&&this._userHandlers.system[type].splice(o,1);else if(void 0!==wm.MIDI_CHANNEL_MESSAGES[type]){if(-1<channel.indexOf("all")){channel=[];for(var j=1;j<=16;j++)channel.push(j);}if(!this._userHandlers.channel[type])return this;channel.forEach(function(chNum){var listeners=that._userHandlers.channel[type][chNum];if(listeners)if(void 0===listener)that._userHandlers.channel[type][chNum]=[];else for(var l=0;l<listeners.length;l++)listeners[l]===listener&&listeners.splice(l,1);});}else{if(void 0!==type)throw new TypeError("The specified event type is not supported.");this._initializeUserHandlers();}return this},Input.prototype._initializeUserHandlers=function(){for(var prop1 in wm.MIDI_CHANNEL_MESSAGES)wm.MIDI_CHANNEL_MESSAGES.hasOwnProperty(prop1)&&(this._userHandlers.channel[prop1]={});for(var prop2 in wm.MIDI_SYSTEM_MESSAGES)wm.MIDI_SYSTEM_MESSAGES.hasOwnProperty(prop2)&&(this._userHandlers.system[prop2]=[]);},Input.prototype._onMidiMessage=function(e){if(0<this._userHandlers.system.midimessage.length){var event={target:this,data:e.data,timestamp:e.timeStamp,type:"midimessage"};this._userHandlers.system.midimessage.forEach(function(callback){callback(event);});}e.data[0]<240?(this._parseChannelEvent(e),this._parseNrpnEvent(e)):e.data[0]<=255&&this._parseSystemEvent(e);},Input.prototype._parseNrpnEvent=function(e){var data1,data2,command=e.data[0]>>4,channelBufferIndex=15&e.data[0],channel=1+channelBufferIndex;if(1<e.data.length&&(data1=e.data[1],data2=2<e.data.length?e.data[2]:void 0),wm.nrpnEventsEnabled&&command===wm.MIDI_CHANNEL_MESSAGES.controlchange&&(data1>=wm.MIDI_NRPN_MESSAGES.increment&&data1<=wm.MIDI_NRPN_MESSAGES.parammsb||data1===wm.MIDI_NRPN_MESSAGES.entrymsb||data1===wm.MIDI_NRPN_MESSAGES.entrylsb)){var ccEvent={target:this,type:"controlchange",data:e.data,timestamp:e.timeStamp,channel:channel,controller:{number:data1,name:this.getCcNameByNumber(data1)},value:data2};if(ccEvent.controller.number===wm.MIDI_NRPN_MESSAGES.parammsb&&ccEvent.value!=wm.MIDI_NRPN_MESSAGES.nullactiveparameter)wm._nrpnBuffer[channelBufferIndex]=[],wm._nrpnBuffer[channelBufferIndex][0]=ccEvent;else if(1===wm._nrpnBuffer[channelBufferIndex].length&&ccEvent.controller.number===wm.MIDI_NRPN_MESSAGES.paramlsb)wm._nrpnBuffer[channelBufferIndex].push(ccEvent);else if(2!==wm._nrpnBuffer[channelBufferIndex].length||ccEvent.controller.number!==wm.MIDI_NRPN_MESSAGES.increment&&ccEvent.controller.number!==wm.MIDI_NRPN_MESSAGES.decrement&&ccEvent.controller.number!==wm.MIDI_NRPN_MESSAGES.entrymsb)if(3===wm._nrpnBuffer[channelBufferIndex].length&&wm._nrpnBuffer[channelBufferIndex][2].number===wm.MIDI_NRPN_MESSAGES.entrymsb&&ccEvent.controller.number===wm.MIDI_NRPN_MESSAGES.entrylsb)wm._nrpnBuffer[channelBufferIndex].push(ccEvent);else if(3<=wm._nrpnBuffer[channelBufferIndex].length&&wm._nrpnBuffer[channelBufferIndex].length<=4&&ccEvent.controller.number===wm.MIDI_NRPN_MESSAGES.parammsb&&ccEvent.value===wm.MIDI_NRPN_MESSAGES.nullactiveparameter)wm._nrpnBuffer[channelBufferIndex].push(ccEvent);else if(4<=wm._nrpnBuffer[channelBufferIndex].length&&wm._nrpnBuffer[channelBufferIndex].length<=5&&ccEvent.controller.number===wm.MIDI_NRPN_MESSAGES.paramlsb&&ccEvent.value===wm.MIDI_NRPN_MESSAGES.nullactiveparameter){wm._nrpnBuffer[channelBufferIndex].push(ccEvent);var rawData=[];wm._nrpnBuffer[channelBufferIndex].forEach(function(ev){rawData.push(ev.data);});var nrpnNumber=wm._nrpnBuffer[channelBufferIndex][0].value<<7|wm._nrpnBuffer[channelBufferIndex][1].value,nrpnValue=wm._nrpnBuffer[channelBufferIndex][2].value;6===wm._nrpnBuffer[channelBufferIndex].length&&(nrpnValue=wm._nrpnBuffer[channelBufferIndex][2].value<<7|wm._nrpnBuffer[channelBufferIndex][3].value);var nrpnControllerType="";switch(wm._nrpnBuffer[channelBufferIndex][2].controller.number){case wm.MIDI_NRPN_MESSAGES.entrymsb:nrpnControllerType=wm._nrpnTypes[0];break;case wm.MIDI_NRPN_MESSAGES.increment:nrpnControllerType=wm._nrpnTypes[1];break;case wm.MIDI_NRPN_MESSAGES.decrement:nrpnControllerType=wm._nrpnTypes[2];break;default:throw new Error("The NPRN type was unidentifiable.")}var nrpnEvent={timestamp:ccEvent.timestamp,channel:ccEvent.channel,type:"nrpn",data:rawData,controller:{number:nrpnNumber,type:nrpnControllerType,name:"Non-Registered Parameter "+nrpnNumber},value:nrpnValue};wm._nrpnBuffer[channelBufferIndex]=[],this._userHandlers.channel[nrpnEvent.type]&&this._userHandlers.channel[nrpnEvent.type][nrpnEvent.channel]&&this._userHandlers.channel[nrpnEvent.type][nrpnEvent.channel].forEach(function(callback){callback(nrpnEvent);});}else wm._nrpnBuffer[channelBufferIndex]=[];else wm._nrpnBuffer[channelBufferIndex].push(ccEvent);}},Input.prototype._parseChannelEvent=function(e){var data1,data2,command=e.data[0]>>4,channel=1+(15&e.data[0]);1<e.data.length&&(data1=e.data[1],data2=2<e.data.length?e.data[2]:void 0);var event={target:this,data:e.data,timestamp:e.timeStamp,channel:channel};command===wm.MIDI_CHANNEL_MESSAGES.noteoff||command===wm.MIDI_CHANNEL_MESSAGES.noteon&&0===data2?(event.type="noteoff",event.note={number:data1,name:wm._notes[data1%12],octave:wm.getOctave(data1)},event.velocity=data2/127,event.rawVelocity=data2):command===wm.MIDI_CHANNEL_MESSAGES.noteon?(event.type="noteon",event.note={number:data1,name:wm._notes[data1%12],octave:wm.getOctave(data1)},event.velocity=data2/127,event.rawVelocity=data2):command===wm.MIDI_CHANNEL_MESSAGES.keyaftertouch?(event.type="keyaftertouch",event.note={number:data1,name:wm._notes[data1%12],octave:wm.getOctave(data1)},event.value=data2/127):command===wm.MIDI_CHANNEL_MESSAGES.controlchange&&0<=data1&&data1<=119?(event.type="controlchange",event.controller={number:data1,name:this.getCcNameByNumber(data1)},event.value=data2):command===wm.MIDI_CHANNEL_MESSAGES.channelmode&&120<=data1&&data1<=127?(event.type="channelmode",event.controller={number:data1,name:this.getChannelModeByNumber(data1)},event.value=data2):command===wm.MIDI_CHANNEL_MESSAGES.programchange?(event.type="programchange",event.value=data1):command===wm.MIDI_CHANNEL_MESSAGES.channelaftertouch?(event.type="channelaftertouch",event.value=data1/127):command===wm.MIDI_CHANNEL_MESSAGES.pitchbend?(event.type="pitchbend",event.value=((data2<<7)+data1-8192)/8192):event.type="unknownchannelmessage",this._userHandlers.channel[event.type]&&this._userHandlers.channel[event.type][channel]&&this._userHandlers.channel[event.type][channel].forEach(function(callback){callback(event);});},Input.prototype.getCcNameByNumber=function(number){if(!(0<=(number=Math.floor(number))&&number<=119))throw new RangeError("The control change number must be between 0 and 119.");for(var cc in wm.MIDI_CONTROL_CHANGE_MESSAGES)if(wm.MIDI_CONTROL_CHANGE_MESSAGES.hasOwnProperty(cc)&&number===wm.MIDI_CONTROL_CHANGE_MESSAGES[cc])return cc},Input.prototype.getChannelModeByNumber=function(number){if(!(120<=(number=Math.floor(number))&&status<=127))throw new RangeError("The control change number must be between 120 and 127.");for(var cm in wm.MIDI_CHANNEL_MODE_MESSAGES)if(wm.MIDI_CHANNEL_MODE_MESSAGES.hasOwnProperty(cm)&&number===wm.MIDI_CHANNEL_MODE_MESSAGES[cm])return cm},Input.prototype._parseSystemEvent=function(e){var command=e.data[0],event={target:this,data:e.data,timestamp:e.timeStamp};command===wm.MIDI_SYSTEM_MESSAGES.sysex?event.type="sysex":command===wm.MIDI_SYSTEM_MESSAGES.timecode?event.type="timecode":command===wm.MIDI_SYSTEM_MESSAGES.songposition?event.type="songposition":command===wm.MIDI_SYSTEM_MESSAGES.songselect?(event.type="songselect",event.song=e.data[1]):command===wm.MIDI_SYSTEM_MESSAGES.tuningrequest?event.type="tuningrequest":command===wm.MIDI_SYSTEM_MESSAGES.clock?event.type="clock":command===wm.MIDI_SYSTEM_MESSAGES.start?event.type="start":command===wm.MIDI_SYSTEM_MESSAGES.continue?event.type="continue":command===wm.MIDI_SYSTEM_MESSAGES.stop?event.type="stop":command===wm.MIDI_SYSTEM_MESSAGES.activesensing?event.type="activesensing":command===wm.MIDI_SYSTEM_MESSAGES.reset?event.type="reset":event.type="unknownsystemmessage",this._userHandlers.system[event.type]&&this._userHandlers.system[event.type].forEach(function(callback){callback(event);});},Output.prototype.send=function(status,data,timestamp){if(!(128<=status&&status<=255))throw new RangeError("The status byte must be an integer between 128 (0x80) and 255 (0xFF).");void 0===data&&(data=[]),Array.isArray(data)||(data=[data]);var message=[];return data.forEach(function(item){var parsed=Math.floor(item);if(!(0<=parsed&&parsed<=255))throw new RangeError("Data bytes must be integers between 0 (0x00) and 255 (0xFF).");message.push(parsed);}),this._midiOutput.send([status].concat(message),parseFloat(timestamp)||0),this},Output.prototype.sendSysex=function(manufacturer,data,options){if(!wm.sysexEnabled)throw new Error("Sysex message support must first be activated.");return options=options||{},manufacturer=[].concat(manufacturer),data.forEach(function(item){if(item<0||127<item)throw new RangeError("The data bytes of a sysex message must be integers between 0 (0x00) and 127 (0x7F).")}),data=manufacturer.concat(data,wm.MIDI_SYSTEM_MESSAGES.sysexend),this.send(wm.MIDI_SYSTEM_MESSAGES.sysex,data,this._parseTimeParameter(options.time)),this},Output.prototype.sendTimecodeQuarterFrame=function(value,options){return options=options||{},this.send(wm.MIDI_SYSTEM_MESSAGES.timecode,value,this._parseTimeParameter(options.time)),this},Output.prototype.sendSongPosition=function(value,options){options=options||{};var msb=(value=Math.floor(value)||0)>>7&127,lsb=127&value;return this.send(wm.MIDI_SYSTEM_MESSAGES.songposition,[msb,lsb],this._parseTimeParameter(options.time)),this},Output.prototype.sendSongSelect=function(value,options){if(options=options||{},!(0<=(value=Math.floor(value))&&value<=127))throw new RangeError("The song number must be between 0 and 127.");return this.send(wm.MIDI_SYSTEM_MESSAGES.songselect,[value],this._parseTimeParameter(options.time)),this},Output.prototype.sendTuningRequest=function(options){return options=options||{},this.send(wm.MIDI_SYSTEM_MESSAGES.tuningrequest,void 0,this._parseTimeParameter(options.time)),this},Output.prototype.sendClock=function(options){return options=options||{},this.send(wm.MIDI_SYSTEM_MESSAGES.clock,void 0,this._parseTimeParameter(options.time)),this},Output.prototype.sendStart=function(options){return options=options||{},this.send(wm.MIDI_SYSTEM_MESSAGES.start,void 0,this._parseTimeParameter(options.time)),this},Output.prototype.sendContinue=function(options){return options=options||{},this.send(wm.MIDI_SYSTEM_MESSAGES.continue,void 0,this._parseTimeParameter(options.time)),this},Output.prototype.sendStop=function(options){return options=options||{},this.send(wm.MIDI_SYSTEM_MESSAGES.stop,void 0,this._parseTimeParameter(options.time)),this},Output.prototype.sendActiveSensing=function(options){return options=options||{},this.send(wm.MIDI_SYSTEM_MESSAGES.activesensing,[],this._parseTimeParameter(options.time)),this},Output.prototype.sendReset=function(options){return options=options||{},this.send(wm.MIDI_SYSTEM_MESSAGES.reset,void 0,this._parseTimeParameter(options.time)),this},Output.prototype.stopNote=function(note,channel,options){if("all"===note)return this.sendChannelMode("allnotesoff",0,channel,options);var nVelocity=64;return (options=options||{}).rawVelocity?!isNaN(options.velocity)&&0<=options.velocity&&options.velocity<=127&&(nVelocity=options.velocity):!isNaN(options.velocity)&&0<=options.velocity&&options.velocity<=1&&(nVelocity=127*options.velocity),this._convertNoteToArray(note).forEach(function(item){wm.toMIDIChannels(channel).forEach(function(ch){this.send((wm.MIDI_CHANNEL_MESSAGES.noteoff<<4)+(ch-1),[item,Math.round(nVelocity)],this._parseTimeParameter(options.time));}.bind(this));}.bind(this)),this},Output.prototype.playNote=function(note,channel,options){var time,nVelocity=64;if((options=options||{}).rawVelocity?!isNaN(options.velocity)&&0<=options.velocity&&options.velocity<=127&&(nVelocity=options.velocity):!isNaN(options.velocity)&&0<=options.velocity&&options.velocity<=1&&(nVelocity=127*options.velocity),time=this._parseTimeParameter(options.time),this._convertNoteToArray(note).forEach(function(item){wm.toMIDIChannels(channel).forEach(function(ch){this.send((wm.MIDI_CHANNEL_MESSAGES.noteon<<4)+(ch-1),[item,Math.round(nVelocity)],time);}.bind(this));}.bind(this)),!isNaN(options.duration)){options.duration<=0&&(options.duration=0);var nRelease=64;options.rawVelocity?!isNaN(options.release)&&0<=options.release&&options.release<=127&&(nRelease=options.release):!isNaN(options.release)&&0<=options.release&&options.release<=1&&(nRelease=127*options.release),this._convertNoteToArray(note).forEach(function(item){wm.toMIDIChannels(channel).forEach(function(ch){this.send((wm.MIDI_CHANNEL_MESSAGES.noteoff<<4)+(ch-1),[item,Math.round(nRelease)],(time||wm.time)+options.duration);}.bind(this));}.bind(this));}return this},Output.prototype.sendKeyAftertouch=function(note,channel,pressure,options){var that=this;if(options=options||{},channel<1||16<channel)throw new RangeError("The channel must be between 1 and 16.");(isNaN(pressure)||pressure<0||1<pressure)&&(pressure=.5);var nPressure=Math.round(127*pressure);return this._convertNoteToArray(note).forEach(function(item){wm.toMIDIChannels(channel).forEach(function(ch){that.send((wm.MIDI_CHANNEL_MESSAGES.keyaftertouch<<4)+(ch-1),[item,nPressure],that._parseTimeParameter(options.time));});}),this},Output.prototype.sendControlChange=function(controller,value,channel,options){if(options=options||{},"string"==typeof controller){if(void 0===(controller=wm.MIDI_CONTROL_CHANGE_MESSAGES[controller]))throw new TypeError("Invalid controller name.")}else if(!(0<=(controller=Math.floor(controller))&&controller<=119))throw new RangeError("Controller numbers must be between 0 and 119.");if(!(0<=(value=Math.floor(value)||0)&&value<=127))throw new RangeError("Controller value must be between 0 and 127.");return wm.toMIDIChannels(channel).forEach(function(ch){this.send((wm.MIDI_CHANNEL_MESSAGES.controlchange<<4)+(ch-1),[controller,value],this._parseTimeParameter(options.time));}.bind(this)),this},Output.prototype._selectRegisteredParameter=function(parameter,channel,time){var that=this;if(parameter[0]=Math.floor(parameter[0]),!(0<=parameter[0]&&parameter[0]<=127))throw new RangeError("The control65 value must be between 0 and 127");if(parameter[1]=Math.floor(parameter[1]),!(0<=parameter[1]&&parameter[1]<=127))throw new RangeError("The control64 value must be between 0 and 127");return wm.toMIDIChannels(channel).forEach(function(){that.sendControlChange(101,parameter[0],channel,{time:time}),that.sendControlChange(100,parameter[1],channel,{time:time});}),this},Output.prototype._selectNonRegisteredParameter=function(parameter,channel,time){var that=this;if(parameter[0]=Math.floor(parameter[0]),!(0<=parameter[0]&&parameter[0]<=127))throw new RangeError("The control63 value must be between 0 and 127");if(parameter[1]=Math.floor(parameter[1]),!(0<=parameter[1]&&parameter[1]<=127))throw new RangeError("The control62 value must be between 0 and 127");return wm.toMIDIChannels(channel).forEach(function(){that.sendControlChange(99,parameter[0],channel,{time:time}),that.sendControlChange(98,parameter[1],channel,{time:time});}),this},Output.prototype._setCurrentRegisteredParameter=function(data,channel,time){var that=this;if((data=[].concat(data))[0]=Math.floor(data[0]),!(0<=data[0]&&data[0]<=127))throw new RangeError("The msb value must be between 0 and 127");return wm.toMIDIChannels(channel).forEach(function(){that.sendControlChange(6,data[0],channel,{time:time});}),data[1]=Math.floor(data[1]),0<=data[1]&&data[1]<=127&&wm.toMIDIChannels(channel).forEach(function(){that.sendControlChange(38,data[1],channel,{time:time});}),this},Output.prototype._deselectRegisteredParameter=function(channel,time){var that=this;return wm.toMIDIChannels(channel).forEach(function(){that.sendControlChange(101,127,channel,{time:time}),that.sendControlChange(100,127,channel,{time:time});}),this},Output.prototype.setRegisteredParameter=function(parameter,data,channel,options){var that=this;if(options=options||{},!Array.isArray(parameter)){if(!wm.MIDI_REGISTERED_PARAMETER[parameter])throw new Error("The specified parameter is not available.");parameter=wm.MIDI_REGISTERED_PARAMETER[parameter];}return wm.toMIDIChannels(channel).forEach(function(){that._selectRegisteredParameter(parameter,channel,options.time),that._setCurrentRegisteredParameter(data,channel,options.time),that._deselectRegisteredParameter(channel,options.time);}),this},Output.prototype.setNonRegisteredParameter=function(parameter,data,channel,options){var that=this;if(options=options||{},!(0<=parameter[0]&&parameter[0]<=127&&0<=parameter[1]&&parameter[1]<=127))throw new Error("Position 0 and 1 of the 2-position parameter array must both be between 0 and 127.");return data=[].concat(data),wm.toMIDIChannels(channel).forEach(function(){that._selectNonRegisteredParameter(parameter,channel,options.time),that._setCurrentRegisteredParameter(data,channel,options.time),that._deselectRegisteredParameter(channel,options.time);}),this},Output.prototype.incrementRegisteredParameter=function(parameter,channel,options){var that=this;if(options=options||{},!Array.isArray(parameter)){if(!wm.MIDI_REGISTERED_PARAMETER[parameter])throw new Error("The specified parameter is not available.");parameter=wm.MIDI_REGISTERED_PARAMETER[parameter];}return wm.toMIDIChannels(channel).forEach(function(){that._selectRegisteredParameter(parameter,channel,options.time),that.sendControlChange(96,0,channel,{time:options.time}),that._deselectRegisteredParameter(channel,options.time);}),this},Output.prototype.decrementRegisteredParameter=function(parameter,channel,options){if(options=options||{},!Array.isArray(parameter)){if(!wm.MIDI_REGISTERED_PARAMETER[parameter])throw new TypeError("The specified parameter is not available.");parameter=wm.MIDI_REGISTERED_PARAMETER[parameter];}return wm.toMIDIChannels(channel).forEach(function(){this._selectRegisteredParameter(parameter,channel,options.time),this.sendControlChange(97,0,channel,{time:options.time}),this._deselectRegisteredParameter(channel,options.time);}.bind(this)),this},Output.prototype.setPitchBendRange=function(semitones,cents,channel,options){var that=this;if(options=options||{},!(0<=(semitones=Math.floor(semitones)||0)&&semitones<=127))throw new RangeError("The semitones value must be between 0 and 127");if(!(0<=(cents=Math.floor(cents)||0)&&cents<=127))throw new RangeError("The cents value must be between 0 and 127");return wm.toMIDIChannels(channel).forEach(function(){that.setRegisteredParameter("pitchbendrange",[semitones,cents],channel,{time:options.time});}),this},Output.prototype.setModulationRange=function(semitones,cents,channel,options){var that=this;if(options=options||{},!(0<=(semitones=Math.floor(semitones)||0)&&semitones<=127))throw new RangeError("The semitones value must be between 0 and 127");if(!(0<=(cents=Math.floor(cents)||0)&&cents<=127))throw new RangeError("The cents value must be between 0 and 127");return wm.toMIDIChannels(channel).forEach(function(){that.setRegisteredParameter("modulationrange",[semitones,cents],channel,{time:options.time});}),this},Output.prototype.setMasterTuning=function(value,channel,options){var that=this;if(options=options||{},(value=parseFloat(value)||0)<=-65||64<=value)throw new RangeError("The value must be a decimal number larger than -65 and smaller than 64.");var coarse=Math.floor(value)+64,fine=value-Math.floor(value),msb=(fine=Math.round((fine+1)/2*16383))>>7&127,lsb=127&fine;return wm.toMIDIChannels(channel).forEach(function(){that.setRegisteredParameter("channelcoarsetuning",coarse,channel,{time:options.time}),that.setRegisteredParameter("channelfinetuning",[msb,lsb],channel,{time:options.time});}),this},Output.prototype.setTuningProgram=function(value,channel,options){var that=this;if(options=options||{},!(0<=(value=Math.floor(value))&&value<=127))throw new RangeError("The program value must be between 0 and 127");return wm.toMIDIChannels(channel).forEach(function(){that.setRegisteredParameter("tuningprogram",value,channel,{time:options.time});}),this},Output.prototype.setTuningBank=function(value,channel,options){var that=this;if(options=options||{},!(0<=(value=Math.floor(value)||0)&&value<=127))throw new RangeError("The bank value must be between 0 and 127");return wm.toMIDIChannels(channel).forEach(function(){that.setRegisteredParameter("tuningbank",value,channel,{time:options.time});}),this},Output.prototype.sendChannelMode=function(command,value,channel,options){if(options=options||{},"string"==typeof command){if(!(command=wm.MIDI_CHANNEL_MODE_MESSAGES[command]))throw new TypeError("Invalid channel mode message name.")}else if(!(120<=(command=Math.floor(command))&&command<=127))throw new RangeError("Channel mode numerical identifiers must be between 120 and 127.");if((value=Math.floor(value)||0)<0||127<value)throw new RangeError("Value must be an integer between 0 and 127.");return wm.toMIDIChannels(channel).forEach(function(ch){this.send((wm.MIDI_CHANNEL_MESSAGES.channelmode<<4)+(ch-1),[command,value],this._parseTimeParameter(options.time));}.bind(this)),this},Output.prototype.sendProgramChange=function(program,channel,options){var that=this;if(options=options||{},program=Math.floor(program),isNaN(program)||program<0||127<program)throw new RangeError("Program numbers must be between 0 and 127.");return wm.toMIDIChannels(channel).forEach(function(ch){that.send((wm.MIDI_CHANNEL_MESSAGES.programchange<<4)+(ch-1),[program],that._parseTimeParameter(options.time));}),this},Output.prototype.sendChannelAftertouch=function(pressure,channel,options){var that=this;options=options||{},pressure=parseFloat(pressure),(isNaN(pressure)||pressure<0||1<pressure)&&(pressure=.5);var nPressure=Math.round(127*pressure);return wm.toMIDIChannels(channel).forEach(function(ch){that.send((wm.MIDI_CHANNEL_MESSAGES.channelaftertouch<<4)+(ch-1),[nPressure],that._parseTimeParameter(options.time));}),this},Output.prototype.sendPitchBend=function(bend,channel,options){var that=this;if(options=options||{},isNaN(bend)||bend<-1||1<bend)throw new RangeError("Pitch bend value must be between -1 and 1.");var nLevel=Math.round((bend+1)/2*16383),msb=nLevel>>7&127,lsb=127&nLevel;return wm.toMIDIChannels(channel).forEach(function(ch){that.send((wm.MIDI_CHANNEL_MESSAGES.pitchbend<<4)+(ch-1),[lsb,msb],that._parseTimeParameter(options.time));}),this},Output.prototype._parseTimeParameter=function(time){var value,parsed=parseFloat(time);return "string"==typeof time&&"+"===time.substring(0,1)?parsed&&0<parsed&&(value=wm.time+parsed):parsed>wm.time&&(value=parsed),value},Output.prototype._convertNoteToArray=function(note){var notes=[];return Array.isArray(note)||(note=[note]),note.forEach(function(item){notes.push(wm.guessNoteNumber(item));}),notes},module.exports?module.exports=wm:scope.WebMidi||(scope.WebMidi=wm);}(commonjsGlobal);
    });

    class OxionMidi {
      static isOxionSysex(data) {
        return (
          data[1] == this.sysexMfgId[0] &&
          data[2] == this.sysexMfgId[1] &&
          data[3] == this.sysexMfgId[2]
        );
      }

      static sortMidiInterfaces(a, b) {
        let aName = `${a.manufacturer} ${a.name}`;
        let bName = `${b.manufacturer} ${b.name}`;

        if (aName < bName) {
          return -1;
        } else if (aName > bName) {
          return 1;
        } else {
          return 0;
        }
      }

      static allInputs() {
        return webmidi_min.inputs.sort(OxionMidi.sortMidiInterfaces);
      }

      static allOutputs() {
        return webmidi_min.outputs.sort(OxionMidi.sortMidiInterfaces);
      }

      static sendConfiguration(configuration, output) {
        if (configuration.device().sendShortMessages) {
          this.sendShortConfiguration(configuration, output);
        } else {
          this.sendFullConfiguration(configuration, output);
        }
      }

      static sendFullConfiguration(configuration, output) {
        output.sendSysex(
          OxionMidi.sysexMfgId,
          [OxionMidi.updateConfigMsg].concat(configuration.toSysexArray())
        );
      }

      static sendShortConfiguration(configuration, output) {
        output.sendSysex(
          OxionMidi.sysexMfgId,
          [OxionMidi.updateDeviceOptionsMsg].concat(
            configuration.toDeviceOptionsSysexArray()
          )
        );

        output.sendSysex(
          OxionMidi.sysexMfgId,
          [OxionMidi.updateUSBOptionsMessage].concat(
            configuration.toUSBOptionsSysexArray()
          )
        );

        output.sendSysex(
          OxionMidi.sysexMfgId,
          [OxionMidi.updateTRSOptionsMessage].concat(
            configuration.toTRSOptionsSysexArray()
          )
        );
      }

      static requestConfig(output) {
        output.sendSysex(OxionMidi.sysexMfgId, [OxionMidi.requestInfoMsg]);
      }
    }

    OxionMidi.sysexMfgId = [0x7d, 0x00, 0x00];
    OxionMidi.requestInfoMsg = 0x1f;
    OxionMidi.updateConfigMsg = 0x0e;
    OxionMidi.updateDeviceOptionsMsg = 0x0d;
    OxionMidi.updateUSBOptionsMessage = 0x0c;
    OxionMidi.updateTRSOptionsMessage = 0x0b;

    /* src/components/Icon.svelte generated by Svelte v3.18.2 */

    const file = "src/components/Icon.svelte";

    function create_fragment(ctx) {
    	let span;
    	let span_class_value;

    	const block = {
    		c: function create() {
    			span = element("span");
    			attr_dev(span, "class", span_class_value = "fas fa-" + /*i*/ ctx[0] + " " + /*classList*/ ctx[1] + " svelte-pvbvkq");
    			add_location(span, file, 13, 0, 160);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*i, classList*/ 3 && span_class_value !== (span_class_value = "fas fa-" + /*i*/ ctx[0] + " " + /*classList*/ ctx[1] + " svelte-pvbvkq")) {
    				attr_dev(span, "class", span_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { i } = $$props;
    	let { classList = "" } = $$props;
    	const writable_props = ["i", "classList"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Icon> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("i" in $$props) $$invalidate(0, i = $$props.i);
    		if ("classList" in $$props) $$invalidate(1, classList = $$props.classList);
    	};

    	$$self.$capture_state = () => {
    		return { i, classList };
    	};

    	$$self.$inject_state = $$props => {
    		if ("i" in $$props) $$invalidate(0, i = $$props.i);
    		if ("classList" in $$props) $$invalidate(1, classList = $$props.classList);
    	};

    	return [i, classList];
    }

    class Icon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { i: 0, classList: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Icon",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*i*/ ctx[0] === undefined && !("i" in props)) {
    			console.warn("<Icon> was created without expected prop 'i'");
    		}
    	}

    	get i() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set i(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get classList() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set classList(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Button.svelte generated by Svelte v3.18.2 */
    const file$1 = "src/components/Button.svelte";

    // (35:4) {#if icon}
    function create_if_block(ctx) {
    	let current;

    	const icon_1 = new Icon({
    			props: { i: /*icon*/ ctx[1] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(icon_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(icon_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const icon_1_changes = {};
    			if (dirty & /*icon*/ 2) icon_1_changes.i = /*icon*/ ctx[1];
    			icon_1.$set(icon_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(icon_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(35:4) {#if icon}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let button;
    	let t0;
    	let t1;
    	let current;
    	let dispose;
    	let if_block = /*icon*/ ctx[1] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			if (if_block) if_block.c();
    			t0 = space();
    			t1 = text(/*label*/ ctx[0]);
    			button.disabled = /*disabled*/ ctx[2];
    			attr_dev(button, "class", "svelte-1gcivh1");
    			add_location(button, file$1, 33, 2, 532);
    			attr_dev(div, "class", "svelte-1gcivh1");
    			add_location(div, file$1, 32, 0, 524);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);
    			if (if_block) if_block.m(button, null);
    			append_dev(button, t0);
    			append_dev(button, t1);
    			current = true;
    			dispose = listen_dev(button, "click", /*dispatchClick*/ ctx[3], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*icon*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(button, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*label*/ 1) set_data_dev(t1, /*label*/ ctx[0]);

    			if (!current || dirty & /*disabled*/ 4) {
    				prop_dev(button, "disabled", /*disabled*/ ctx[2]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { label } = $$props;
    	let { clickMessageName = null } = $$props;
    	let { icon = null } = $$props;
    	let { disabled = false } = $$props;
    	const dispatch = createEventDispatcher();

    	function dispatchClick() {
    		dispatch("message", { name: clickMessageName });
    	}

    	const writable_props = ["label", "clickMessageName", "icon", "disabled"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Button> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("label" in $$props) $$invalidate(0, label = $$props.label);
    		if ("clickMessageName" in $$props) $$invalidate(4, clickMessageName = $$props.clickMessageName);
    		if ("icon" in $$props) $$invalidate(1, icon = $$props.icon);
    		if ("disabled" in $$props) $$invalidate(2, disabled = $$props.disabled);
    	};

    	$$self.$capture_state = () => {
    		return { label, clickMessageName, icon, disabled };
    	};

    	$$self.$inject_state = $$props => {
    		if ("label" in $$props) $$invalidate(0, label = $$props.label);
    		if ("clickMessageName" in $$props) $$invalidate(4, clickMessageName = $$props.clickMessageName);
    		if ("icon" in $$props) $$invalidate(1, icon = $$props.icon);
    		if ("disabled" in $$props) $$invalidate(2, disabled = $$props.disabled);
    	};

    	return [label, icon, disabled, dispatchClick, clickMessageName];
    }

    class Button extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			label: 0,
    			clickMessageName: 4,
    			icon: 1,
    			disabled: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Button",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*label*/ ctx[0] === undefined && !("label" in props)) {
    			console.warn("<Button> was created without expected prop 'label'");
    		}
    	}

    	get label() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get clickMessageName() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set clickMessageName(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get icon() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set icon(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/CheckOption.svelte generated by Svelte v3.18.2 */

    const file$2 = "src/components/CheckOption.svelte";

    function create_fragment$2(ctx) {
    	let p;
    	let label;
    	let input;
    	let t;
    	let current;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	const block = {
    		c: function create() {
    			p = element("p");
    			label = element("label");
    			input = element("input");
    			t = space();
    			if (default_slot) default_slot.c();
    			attr_dev(input, "type", "checkbox");
    			add_location(input, file$2, 9, 4, 78);
    			add_location(label, file$2, 8, 2, 66);
    			add_location(p, file$2, 7, 0, 60);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, label);
    			append_dev(label, input);
    			input.checked = /*checked*/ ctx[0];
    			append_dev(label, t);

    			if (default_slot) {
    				default_slot.m(label, null);
    			}

    			current = true;
    			dispose = listen_dev(input, "change", /*input_change_handler*/ ctx[3]);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*checked*/ 1) {
    				input.checked = /*checked*/ ctx[0];
    			}

    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 2) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[1], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (default_slot) default_slot.d(detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { checked } = $$props;
    	const writable_props = ["checked"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CheckOption> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	function input_change_handler() {
    		checked = this.checked;
    		$$invalidate(0, checked);
    	}

    	$$self.$set = $$props => {
    		if ("checked" in $$props) $$invalidate(0, checked = $$props.checked);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { checked };
    	};

    	$$self.$inject_state = $$props => {
    		if ("checked" in $$props) $$invalidate(0, checked = $$props.checked);
    	};

    	return [checked, $$scope, $$slots, input_change_handler];
    }

    class CheckOption extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { checked: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CheckOption",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*checked*/ ctx[0] === undefined && !("checked" in props)) {
    			console.warn("<CheckOption> was created without expected prop 'checked'");
    		}
    	}

    	get checked() {
    		throw new Error("<CheckOption>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set checked(value) {
    		throw new Error("<CheckOption>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Control.svelte generated by Svelte v3.18.2 */

    const file$3 = "src/components/Control.svelte";

    // (17:2) {#if !disableValue}
    function create_if_block$1(ctx) {
    	let dt;
    	let dd;
    	let div1;
    	let t1;
    	let div0;
    	let if_block = /*control*/ ctx[0].val !== undefined && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			dt = element("dt");
    			dt.textContent = "Value";
    			dd = element("dd");
    			div1 = element("div");
    			if (if_block) if_block.c();
    			t1 = space();
    			div0 = element("div");
    			attr_dev(dt, "class", "svelte-5fijw0");
    			add_location(dt, file$3, 17, 2, 720);
    			attr_dev(div0, "class", "bar svelte-5fijw0");
    			set_style(div0, "height", /*control*/ ctx[0].val + "px");
    			set_style(div0, "background-color", "rgb(" + /*channelColours*/ ctx[5][/*index*/ ctx[1]] + ",125,125)");
    			add_location(div0, file$3, 23, 6, 914);
    			attr_dev(div1, "class", "inner svelte-5fijw0");
    			add_location(div1, file$3, 19, 4, 762);
    			attr_dev(dd, "class", "display svelte-5fijw0");
    			add_location(dd, file$3, 18, 2, 737);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, dt, anchor);
    			insert_dev(target, dd, anchor);
    			append_dev(dd, div1);
    			if (if_block) if_block.m(div1, null);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    		},
    		p: function update(ctx, dirty) {
    			if (/*control*/ ctx[0].val !== undefined) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(div1, t1);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*control*/ 1) {
    				set_style(div0, "height", /*control*/ ctx[0].val + "px");
    			}

    			if (dirty & /*index*/ 2) {
    				set_style(div0, "background-color", "rgb(" + /*channelColours*/ ctx[5][/*index*/ ctx[1]] + ",125,125)");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(dt);
    			if (detaching) detach_dev(dd);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(17:2) {#if !disableValue}",
    		ctx
    	});

    	return block;
    }

    // (21:6) {#if control.val !== undefined}
    function create_if_block_1(ctx) {
    	let span;
    	let t_value = /*control*/ ctx[0].val + "";
    	let t;
    	let span_class_value;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", span_class_value = "" + (null_to_empty(/*control*/ ctx[0].val < 27 ? "lowvalue" : "") + " svelte-5fijw0"));
    			add_location(span, file$3, 21, 6, 826);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*control*/ 1 && t_value !== (t_value = /*control*/ ctx[0].val + "")) set_data_dev(t, t_value);

    			if (dirty & /*control*/ 1 && span_class_value !== (span_class_value = "" + (null_to_empty(/*control*/ ctx[0].val < 27 ? "lowvalue" : "") + " svelte-5fijw0"))) {
    				attr_dev(span, "class", span_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(21:6) {#if control.val !== undefined}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let dl;
    	let dt0;
    	let t0_value = /*names*/ ctx[4][/*index*/ ctx[1]] + "";
    	let t0;
    	let dt1;
    	let dd0;
    	let t2_value = /*channelNames*/ ctx[3][/*control*/ ctx[0].channel] + "";
    	let t2;
    	let dt2;
    	let dd1;
    	let t4_value = /*control*/ ctx[0].cc + "";
    	let t4;
    	let if_block = !/*disableValue*/ ctx[2] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			dl = element("dl");
    			dt0 = element("dt");
    			t0 = text(t0_value);
    			dt1 = element("dt");
    			dt1.textContent = "Channel";
    			dd0 = element("dd");
    			t2 = text(t2_value);
    			dt2 = element("dt");
    			dt2.textContent = "CC";
    			dd1 = element("dd");
    			t4 = text(t4_value);
    			if (if_block) if_block.c();
    			attr_dev(dt0, "class", "index svelte-5fijw0");
    			set_style(dt0, "background-color", "rgb(" + /*channelColours*/ ctx[5][/*index*/ ctx[1]] + ",125,125)");
    			add_location(dt0, file$3, 11, 2, 495);
    			attr_dev(dt1, "class", "svelte-5fijw0");
    			add_location(dt1, file$3, 12, 2, 598);
    			attr_dev(dd0, "class", "svelte-5fijw0");
    			add_location(dd0, file$3, 13, 2, 617);
    			attr_dev(dt2, "class", "svelte-5fijw0");
    			add_location(dt2, file$3, 14, 2, 660);
    			attr_dev(dd1, "class", "svelte-5fijw0");
    			add_location(dd1, file$3, 15, 2, 674);
    			attr_dev(dl, "class", "config-column svelte-5fijw0");
    			add_location(dl, file$3, 10, 0, 466);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, dl, anchor);
    			append_dev(dl, dt0);
    			append_dev(dt0, t0);
    			append_dev(dl, dt1);
    			append_dev(dl, dd0);
    			append_dev(dd0, t2);
    			append_dev(dl, dt2);
    			append_dev(dl, dd1);
    			append_dev(dd1, t4);
    			if (if_block) if_block.m(dl, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*index*/ 2 && t0_value !== (t0_value = /*names*/ ctx[4][/*index*/ ctx[1]] + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*index*/ 2) {
    				set_style(dt0, "background-color", "rgb(" + /*channelColours*/ ctx[5][/*index*/ ctx[1]] + ",125,125)");
    			}

    			if (dirty & /*control*/ 1 && t2_value !== (t2_value = /*channelNames*/ ctx[3][/*control*/ ctx[0].channel] + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*control*/ 1 && t4_value !== (t4_value = /*control*/ ctx[0].cc + "")) set_data_dev(t4, t4_value);

    			if (!/*disableValue*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(dl, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(dl);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { control } = $$props;
    	let { index } = $$props;
    	let { disableValue = false } = $$props;

    	let channelNames = [
    		"OFF",
    		"1",
    		"2",
    		"3",
    		"4",
    		"5",
    		"6",
    		"7",
    		"8",
    		"9",
    		"10",
    		"11",
    		"12",
    		"13",
    		"14",
    		"15",
    		"16"
    	];

    	let names = [
    		"Fader 1",
    		"Fader 2",
    		"Fader 3",
    		"Fader 4",
    		"Fader 5",
    		"Fader 6",
    		"Fader 7",
    		"Fader 8",
    		" ↑ Front",
    		"↑ Back",
    		"↑ Right",
    		"↑ Left",
    		"⟳",
    		"⟲",
    		"ʎɐʍ sᴉɥʇ",
    		"this way"
    	];

    	let channelColours = [125, 125, 125, 125, 125, 125, 125, 125, 155, 155, 155, 155, 155, 155, 155, 155];
    	const writable_props = ["control", "index", "disableValue"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Control> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("control" in $$props) $$invalidate(0, control = $$props.control);
    		if ("index" in $$props) $$invalidate(1, index = $$props.index);
    		if ("disableValue" in $$props) $$invalidate(2, disableValue = $$props.disableValue);
    	};

    	$$self.$capture_state = () => {
    		return {
    			control,
    			index,
    			disableValue,
    			channelNames,
    			names,
    			channelColours
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("control" in $$props) $$invalidate(0, control = $$props.control);
    		if ("index" in $$props) $$invalidate(1, index = $$props.index);
    		if ("disableValue" in $$props) $$invalidate(2, disableValue = $$props.disableValue);
    		if ("channelNames" in $$props) $$invalidate(3, channelNames = $$props.channelNames);
    		if ("names" in $$props) $$invalidate(4, names = $$props.names);
    		if ("channelColours" in $$props) $$invalidate(5, channelColours = $$props.channelColours);
    	};

    	return [control, index, disableValue, channelNames, names, channelColours];
    }

    class Control extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { control: 0, index: 1, disableValue: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Control",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*control*/ ctx[0] === undefined && !("control" in props)) {
    			console.warn("<Control> was created without expected prop 'control'");
    		}

    		if (/*index*/ ctx[1] === undefined && !("index" in props)) {
    			console.warn("<Control> was created without expected prop 'index'");
    		}
    	}

    	get control() {
    		throw new Error("<Control>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set control(value) {
    		throw new Error("<Control>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get index() {
    		throw new Error("<Control>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set index(value) {
    		throw new Error("<Control>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disableValue() {
    		throw new Error("<Control>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disableValue(value) {
    		throw new Error("<Control>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/EditControl.svelte generated by Svelte v3.18.2 */
    const file$4 = "src/components/EditControl.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    // (53:6) {#each possibleChannels as channel}
    function create_each_block(ctx) {
    	let option;
    	let t_value = /*channelNames*/ ctx[3][/*channel*/ ctx[11]] + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*channel*/ ctx[11];
    			option.value = option.__value;
    			add_location(option, file$4, 53, 8, 1476);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*possibleChannels*/ 4 && t_value !== (t_value = /*channelNames*/ ctx[3][/*channel*/ ctx[11]] + "")) set_data_dev(t, t_value);

    			if (dirty & /*possibleChannels*/ 4 && option_value_value !== (option_value_value = /*channel*/ ctx[11])) {
    				prop_dev(option, "__value", option_value_value);
    			}

    			option.value = option.__value;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(53:6) {#each possibleChannels as channel}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let dl;
    	let dt0;
    	let t0_value = /*names*/ ctx[4][/*index*/ ctx[1]] + "";
    	let t0;
    	let dt1;
    	let dd0;
    	let select;
    	let t2;
    	let dt2;
    	let dd1;
    	let input;
    	let input_updating = false;
    	let dispose;
    	let each_value = /*possibleChannels*/ ctx[2];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	function input_input_handler() {
    		input_updating = true;
    		/*input_input_handler*/ ctx[10].call(input);
    	}

    	const block = {
    		c: function create() {
    			dl = element("dl");
    			dt0 = element("dt");
    			t0 = text(t0_value);
    			dt1 = element("dt");
    			dt1.textContent = "Channel";
    			dd0 = element("dd");
    			select = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			dt2 = element("dt");
    			dt2.textContent = "CC";
    			dd1 = element("dd");
    			input = element("input");
    			attr_dev(dt0, "class", "index svelte-6nh3sy");
    			set_style(dt0, "background-color", "rgb(" + /*channelColours*/ ctx[5][/*index*/ ctx[1]] + ",125,125)");
    			add_location(dt0, file$4, 48, 2, 1228);
    			attr_dev(dt1, "class", "svelte-6nh3sy");
    			add_location(dt1, file$4, 49, 2, 1331);
    			if (/*editControl*/ ctx[0].channel === void 0) add_render_callback(() => /*select_change_handler*/ ctx[9].call(select));
    			add_location(select, file$4, 51, 4, 1359);
    			attr_dev(dd0, "class", "svelte-6nh3sy");
    			add_location(dd0, file$4, 50, 2, 1350);
    			attr_dev(dt2, "class", "svelte-6nh3sy");
    			add_location(dt2, file$4, 57, 2, 1571);
    			attr_dev(input, "type", "number");
    			attr_dev(input, "min", "1");
    			attr_dev(input, "max", "127");
    			add_location(input, file$4, 59, 4, 1594);
    			attr_dev(dd1, "class", "svelte-6nh3sy");
    			add_location(dd1, file$4, 58, 2, 1585);
    			attr_dev(dl, "class", "config-column svelte-6nh3sy");
    			add_location(dl, file$4, 47, 0, 1199);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, dl, anchor);
    			append_dev(dl, dt0);
    			append_dev(dt0, t0);
    			append_dev(dl, dt1);
    			append_dev(dl, dd0);
    			append_dev(dd0, select);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, /*editControl*/ ctx[0].channel);
    			append_dev(dd0, t2);
    			append_dev(dl, dt2);
    			append_dev(dl, dd1);
    			append_dev(dd1, input);
    			set_input_value(input, /*editControl*/ ctx[0].cc);

    			dispose = [
    				listen_dev(select, "change", /*select_change_handler*/ ctx[9]),
    				listen_dev(select, "change", /*touchControl*/ ctx[6], false, false, false),
    				listen_dev(input, "input", input_input_handler),
    				listen_dev(input, "change", /*touchControl*/ ctx[6], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*index*/ 2 && t0_value !== (t0_value = /*names*/ ctx[4][/*index*/ ctx[1]] + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*index*/ 2) {
    				set_style(dt0, "background-color", "rgb(" + /*channelColours*/ ctx[5][/*index*/ ctx[1]] + ",125,125)");
    			}

    			if (dirty & /*possibleChannels, channelNames*/ 12) {
    				each_value = /*possibleChannels*/ ctx[2];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*editControl*/ 1) {
    				select_option(select, /*editControl*/ ctx[0].channel);
    			}

    			if (!input_updating && dirty & /*editControl*/ 1) {
    				set_input_value(input, /*editControl*/ ctx[0].cc);
    			}

    			input_updating = false;
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(dl);
    			destroy_each(each_blocks, detaching);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $editConfiguration;
    	validate_store(editConfiguration, "editConfiguration");
    	component_subscribe($$self, editConfiguration, $$value => $$invalidate(7, $editConfiguration = $$value));
    	let { index } = $$props;
    	let { editControl } = $$props;
    	let possibleChannels = Array.from(Array(17).keys());
    	possibleChannels.forEach((c, i) => $$invalidate(2, possibleChannels[i] = c, possibleChannels));

    	//   possibleChannels.forEach((c, i) => (possibleChannels[i] = c + 1));
    	let channelNames = [
    		"OFF",
    		"1",
    		"2",
    		"3",
    		"4",
    		"5",
    		"6",
    		"7",
    		"8",
    		"9",
    		"10",
    		"11",
    		"12",
    		"13",
    		"14",
    		"15",
    		"16"
    	];

    	let names = [
    		"Fader 1",
    		"Fader 2",
    		"Fader 3",
    		"Fader 4",
    		"Fader 5",
    		"Fader 6",
    		"Fader 7",
    		"Fader 8",
    		" ↑ Front",
    		"↑ Back",
    		"↑ Right",
    		"↑ Left",
    		"⟳",
    		"⟲",
    		"ʎɐʍ sᴉɥʇ",
    		"this way"
    	];

    	let channelColours = [125, 125, 125, 125, 125, 125, 125, 125, 155, 155, 155, 155, 155, 155, 155, 155];
    	let possibleCCs = Array.from(Array(128).keys());

    	function touchControl() {
    		editConfiguration.update(old => $editConfiguration);
    	}

    	const writable_props = ["index", "editControl"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<EditControl> was created with unknown prop '${key}'`);
    	});

    	function select_change_handler() {
    		editControl.channel = select_value(this);
    		$$invalidate(0, editControl);
    		$$invalidate(2, possibleChannels);
    	}

    	function input_input_handler() {
    		editControl.cc = to_number(this.value);
    		$$invalidate(0, editControl);
    		$$invalidate(2, possibleChannels);
    	}

    	$$self.$set = $$props => {
    		if ("index" in $$props) $$invalidate(1, index = $$props.index);
    		if ("editControl" in $$props) $$invalidate(0, editControl = $$props.editControl);
    	};

    	$$self.$capture_state = () => {
    		return {
    			index,
    			editControl,
    			possibleChannels,
    			channelNames,
    			names,
    			channelColours,
    			possibleCCs,
    			$editConfiguration
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("index" in $$props) $$invalidate(1, index = $$props.index);
    		if ("editControl" in $$props) $$invalidate(0, editControl = $$props.editControl);
    		if ("possibleChannels" in $$props) $$invalidate(2, possibleChannels = $$props.possibleChannels);
    		if ("channelNames" in $$props) $$invalidate(3, channelNames = $$props.channelNames);
    		if ("names" in $$props) $$invalidate(4, names = $$props.names);
    		if ("channelColours" in $$props) $$invalidate(5, channelColours = $$props.channelColours);
    		if ("possibleCCs" in $$props) possibleCCs = $$props.possibleCCs;
    		if ("$editConfiguration" in $$props) editConfiguration.set($editConfiguration = $$props.$editConfiguration);
    	};

    	return [
    		editControl,
    		index,
    		possibleChannels,
    		channelNames,
    		names,
    		channelColours,
    		touchControl,
    		$editConfiguration,
    		possibleCCs,
    		select_change_handler,
    		input_input_handler
    	];
    }

    class EditControl extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { index: 1, editControl: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EditControl",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*index*/ ctx[1] === undefined && !("index" in props)) {
    			console.warn("<EditControl> was created without expected prop 'index'");
    		}

    		if (/*editControl*/ ctx[0] === undefined && !("editControl" in props)) {
    			console.warn("<EditControl> was created without expected prop 'editControl'");
    		}
    	}

    	get index() {
    		throw new Error("<EditControl>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set index(value) {
    		throw new Error("<EditControl>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get editControl() {
    		throw new Error("<EditControl>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set editControl(value) {
    		throw new Error("<EditControl>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/ControlButton.svelte generated by Svelte v3.18.2 */

    const file$5 = "src/components/ControlButton.svelte";

    // (29:0) {:else}
    function create_else_block(ctx) {
    	let dt0;
    	let dd0;
    	let t1_value = /*control*/ ctx[0].paramA + "";
    	let t1;
    	let dt1;
    	let dd1;
    	let t3_value = /*control*/ ctx[0].paramB + "";
    	let t3;

    	const block = {
    		c: function create() {
    			dt0 = element("dt");
    			dt0.textContent = "CC";
    			dd0 = element("dd");
    			t1 = text(t1_value);
    			dt1 = element("dt");
    			dt1.textContent = "On Value";
    			dd1 = element("dd");
    			t3 = text(t3_value);
    			attr_dev(dt0, "class", "svelte-5fijw0");
    			add_location(dt0, file$5, 29, 2, 746);
    			attr_dev(dd0, "class", "svelte-5fijw0");
    			add_location(dd0, file$5, 30, 2, 760);
    			attr_dev(dt1, "class", "svelte-5fijw0");
    			add_location(dt1, file$5, 31, 4, 790);
    			attr_dev(dd1, "class", "svelte-5fijw0");
    			add_location(dd1, file$5, 32, 2, 810);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, dt0, anchor);
    			insert_dev(target, dd0, anchor);
    			append_dev(dd0, t1);
    			insert_dev(target, dt1, anchor);
    			insert_dev(target, dd1, anchor);
    			append_dev(dd1, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*control*/ 1 && t1_value !== (t1_value = /*control*/ ctx[0].paramA + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*control*/ 1 && t3_value !== (t3_value = /*control*/ ctx[0].paramB + "")) set_data_dev(t3, t3_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(dt0);
    			if (detaching) detach_dev(dd0);
    			if (detaching) detach_dev(dt1);
    			if (detaching) detach_dev(dd1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(29:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (22:0) {#if control.mode == "1"}
    function create_if_block$2(ctx) {
    	let dt0;
    	let dd0;
    	let t1_value = /*control*/ ctx[0].paramA + "";
    	let t1;
    	let t2;
    	let t3_value = /*fromMidi*/ ctx[4](/*control*/ ctx[0].paramA) + "";
    	let t3;
    	let t4;
    	let dt1;
    	let dd1;
    	let t6_value = /*control*/ ctx[0].paramB + "";
    	let t6;

    	const block = {
    		c: function create() {
    			dt0 = element("dt");
    			dt0.textContent = "Note Number";
    			dd0 = element("dd");
    			t1 = text(t1_value);
    			t2 = text(" (");
    			t3 = text(t3_value);
    			t4 = text(")");
    			dt1 = element("dt");
    			dt1.textContent = "Velocity";
    			dd1 = element("dd");
    			t6 = text(t6_value);
    			attr_dev(dt0, "class", "svelte-5fijw0");
    			add_location(dt0, file$5, 22, 2, 600);
    			attr_dev(dd0, "class", "svelte-5fijw0");
    			add_location(dd0, file$5, 23, 2, 623);
    			attr_dev(dt1, "class", "svelte-5fijw0");
    			add_location(dt1, file$5, 26, 4, 690);
    			attr_dev(dd1, "class", "svelte-5fijw0");
    			add_location(dd1, file$5, 27, 2, 710);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, dt0, anchor);
    			insert_dev(target, dd0, anchor);
    			append_dev(dd0, t1);
    			append_dev(dd0, t2);
    			append_dev(dd0, t3);
    			append_dev(dd0, t4);
    			insert_dev(target, dt1, anchor);
    			insert_dev(target, dd1, anchor);
    			append_dev(dd1, t6);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*control*/ 1 && t1_value !== (t1_value = /*control*/ ctx[0].paramA + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*control*/ 1 && t3_value !== (t3_value = /*fromMidi*/ ctx[4](/*control*/ ctx[0].paramA) + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*control*/ 1 && t6_value !== (t6_value = /*control*/ ctx[0].paramB + "")) set_data_dev(t6, t6_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(dt0);
    			if (detaching) detach_dev(dd0);
    			if (detaching) detach_dev(dt1);
    			if (detaching) detach_dev(dd1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(22:0) {#if control.mode == \\\"1\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let dl;
    	let dt0;
    	let t0_value = /*buttonNames*/ ctx[3][/*index*/ ctx[1]] + "";
    	let t0;
    	let dt1;
    	let dd0;
    	let t2_value = /*control*/ ctx[0].channel + "";
    	let t2;
    	let dt2;
    	let dd1;
    	let t4_value = /*modeNames*/ ctx[2][/*control*/ ctx[0].mode] + "";
    	let t4;

    	function select_block_type(ctx, dirty) {
    		if (/*control*/ ctx[0].mode == "1") return create_if_block$2;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			dl = element("dl");
    			dt0 = element("dt");
    			t0 = text(t0_value);
    			dt1 = element("dt");
    			dt1.textContent = "Channel";
    			dd0 = element("dd");
    			t2 = text(t2_value);
    			dt2 = element("dt");
    			dt2.textContent = "Mode";
    			dd1 = element("dd");
    			t4 = text(t4_value);
    			if_block.c();
    			attr_dev(dt0, "class", "index svelte-5fijw0");
    			add_location(dt0, file$5, 14, 2, 421);
    			attr_dev(dt1, "class", "svelte-5fijw0");
    			add_location(dt1, file$5, 15, 2, 467);
    			attr_dev(dd0, "class", "svelte-5fijw0");
    			add_location(dd0, file$5, 16, 2, 486);
    			attr_dev(dt2, "class", "svelte-5fijw0");
    			add_location(dt2, file$5, 17, 2, 515);
    			attr_dev(dd1, "class", "svelte-5fijw0");
    			add_location(dd1, file$5, 20, 2, 537);
    			attr_dev(dl, "class", "config-column svelte-5fijw0");
    			add_location(dl, file$5, 13, 0, 392);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, dl, anchor);
    			append_dev(dl, dt0);
    			append_dev(dt0, t0);
    			append_dev(dl, dt1);
    			append_dev(dl, dd0);
    			append_dev(dd0, t2);
    			append_dev(dl, dt2);
    			append_dev(dl, dd1);
    			append_dev(dd1, t4);
    			if_block.m(dl, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*index*/ 2 && t0_value !== (t0_value = /*buttonNames*/ ctx[3][/*index*/ ctx[1]] + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*control*/ 1 && t2_value !== (t2_value = /*control*/ ctx[0].channel + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*control*/ 1 && t4_value !== (t4_value = /*modeNames*/ ctx[2][/*control*/ ctx[0].mode] + "")) set_data_dev(t4, t4_value);

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(dl, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(dl);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { control } = $$props;
    	let { index } = $$props;
    	let { disableValue = false } = $$props;
    	let modeNames = ["CC", "Keyboard"];
    	let buttonNames = ["A", "B", "C", "D"];
    	let CHROMATIC = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

    	function fromMidi(midi) {
    		var name = CHROMATIC[midi % 12];
    		var oct = Math.floor(midi / 12) - 1;
    		return name + oct;
    	}

    	const writable_props = ["control", "index", "disableValue"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ControlButton> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("control" in $$props) $$invalidate(0, control = $$props.control);
    		if ("index" in $$props) $$invalidate(1, index = $$props.index);
    		if ("disableValue" in $$props) $$invalidate(5, disableValue = $$props.disableValue);
    	};

    	$$self.$capture_state = () => {
    		return {
    			control,
    			index,
    			disableValue,
    			modeNames,
    			buttonNames,
    			CHROMATIC
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("control" in $$props) $$invalidate(0, control = $$props.control);
    		if ("index" in $$props) $$invalidate(1, index = $$props.index);
    		if ("disableValue" in $$props) $$invalidate(5, disableValue = $$props.disableValue);
    		if ("modeNames" in $$props) $$invalidate(2, modeNames = $$props.modeNames);
    		if ("buttonNames" in $$props) $$invalidate(3, buttonNames = $$props.buttonNames);
    		if ("CHROMATIC" in $$props) CHROMATIC = $$props.CHROMATIC;
    	};

    	return [control, index, modeNames, buttonNames, fromMidi, disableValue];
    }

    class ControlButton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { control: 0, index: 1, disableValue: 5 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ControlButton",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*control*/ ctx[0] === undefined && !("control" in props)) {
    			console.warn("<ControlButton> was created without expected prop 'control'");
    		}

    		if (/*index*/ ctx[1] === undefined && !("index" in props)) {
    			console.warn("<ControlButton> was created without expected prop 'index'");
    		}
    	}

    	get control() {
    		throw new Error("<ControlButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set control(value) {
    		throw new Error("<ControlButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get index() {
    		throw new Error("<ControlButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set index(value) {
    		throw new Error("<ControlButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disableValue() {
    		throw new Error("<ControlButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disableValue(value) {
    		throw new Error("<ControlButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/EditControlButton.svelte generated by Svelte v3.18.2 */
    const file$6 = "src/components/EditControlButton.svelte";

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	return child_ctx;
    }

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[26] = list[i];
    	return child_ctx;
    }

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[29] = list[i];
    	return child_ctx;
    }

    // (57:6) {#each possibleChannels as channel}
    function create_each_block_5(ctx) {
    	let option;
    	let t_value = /*channel*/ ctx[29] + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*channel*/ ctx[29];
    			option.value = option.__value;
    			add_location(option, file$6, 57, 8, 1385);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*possibleChannels*/ 4 && t_value !== (t_value = /*channel*/ ctx[29] + "")) set_data_dev(t, t_value);

    			if (dirty[0] & /*possibleChannels*/ 4 && option_value_value !== (option_value_value = /*channel*/ ctx[29])) {
    				prop_dev(option, "__value", option_value_value);
    			}

    			option.value = option.__value;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_5.name,
    		type: "each",
    		source: "(57:6) {#each possibleChannels as channel}",
    		ctx
    	});

    	return block;
    }

    // (66:1) {#each possibleModes as mode}
    function create_each_block_4(ctx) {
    	let option;
    	let t_value = /*modeNames*/ ctx[5][/*mode*/ ctx[26]] + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*mode*/ ctx[26];
    			option.value = option.__value;
    			add_location(option, file$6, 66, 8, 1594);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(66:1) {#each possibleModes as mode}",
    		ctx
    	});

    	return block;
    }

    // (96:2) {:else}
    function create_else_block$1(ctx) {
    	let dt0;
    	let dd0;
    	let select0;
    	let t1;
    	let dt1;
    	let dd1;
    	let select1;
    	let dispose;
    	let each_value_3 = /*possibleCCs*/ ctx[3];
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_1[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value_2 = /*possibleCCs*/ ctx[3];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			dt0 = element("dt");
    			dt0.textContent = "Controller";
    			dd0 = element("dd");
    			select0 = element("select");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t1 = space();
    			dt1 = element("dt");
    			dt1.textContent = "On value";
    			dd1 = element("dd");
    			select1 = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(dt0, "class", "svelte-6nh3sy");
    			add_location(dt0, file$6, 96, 4, 2183);
    			if (/*editControl*/ ctx[0].paramA === void 0) add_render_callback(() => /*select0_change_handler_2*/ ctx[15].call(select0));
    			add_location(select0, file$6, 98, 3, 2213);
    			attr_dev(dd0, "class", "svelte-6nh3sy");
    			add_location(dd0, file$6, 97, 2, 2205);
    			attr_dev(dt1, "class", "svelte-6nh3sy");
    			add_location(dt1, file$6, 106, 2, 2393);
    			if (/*editControl*/ ctx[0].paramB === void 0) add_render_callback(() => /*select1_change_handler_2*/ ctx[16].call(select1));
    			add_location(select1, file$6, 108, 3, 2421);
    			attr_dev(dd1, "class", "svelte-6nh3sy");
    			add_location(dd1, file$6, 107, 2, 2413);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, dt0, anchor);
    			insert_dev(target, dd0, anchor);
    			append_dev(dd0, select0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(select0, null);
    			}

    			select_option(select0, /*editControl*/ ctx[0].paramA);
    			append_dev(dd0, t1);
    			insert_dev(target, dt1, anchor);
    			insert_dev(target, dd1, anchor);
    			append_dev(dd1, select1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select1, null);
    			}

    			select_option(select1, /*editControl*/ ctx[0].paramB);

    			dispose = [
    				listen_dev(select0, "change", /*select0_change_handler_2*/ ctx[15]),
    				listen_dev(select0, "change", /*touchControl*/ ctx[6], false, false, false),
    				listen_dev(select1, "change", /*select1_change_handler_2*/ ctx[16]),
    				listen_dev(select1, "change", /*touchControl*/ ctx[6], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*possibleCCs*/ 8) {
    				each_value_3 = /*possibleCCs*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_3(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(select0, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_3.length;
    			}

    			if (dirty[0] & /*editControl*/ 1) {
    				select_option(select0, /*editControl*/ ctx[0].paramA);
    			}

    			if (dirty[0] & /*possibleCCs*/ 8) {
    				each_value_2 = /*possibleCCs*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}

    			if (dirty[0] & /*editControl*/ 1) {
    				select_option(select1, /*editControl*/ ctx[0].paramB);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(dt0);
    			if (detaching) detach_dev(dd0);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach_dev(dt1);
    			if (detaching) detach_dev(dd1);
    			destroy_each(each_blocks, detaching);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(96:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (74:0) {#if editControl.mode == "1"}
    function create_if_block$3(ctx) {
    	let dt0;
    	let dd0;
    	let select0;
    	let t1;
    	let t2_value = /*fromMidi*/ ctx[8](/*editControl*/ ctx[0].paramA) + "";
    	let t2;
    	let t3;
    	let dt1;
    	let dd1;
    	let select1;
    	let dispose;
    	let each_value_1 = /*possibleCCs*/ ctx[3];
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*possibleCCs*/ ctx[3];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			dt0 = element("dt");
    			dt0.textContent = "Note number";
    			dd0 = element("dd");
    			select0 = element("select");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t1 = text("\n    (");
    			t2 = text(t2_value);
    			t3 = text(")\n  ");
    			dt1 = element("dt");
    			dt1.textContent = "Velocity";
    			dd1 = element("dd");
    			select1 = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(dt0, "class", "svelte-6nh3sy");
    			add_location(dt0, file$6, 74, 2, 1715);
    			if (/*editControl*/ ctx[0].paramA === void 0) add_render_callback(() => /*select0_change_handler_1*/ ctx[13].call(select0));
    			add_location(select0, file$6, 76, 3, 1746);
    			attr_dev(dd0, "class", "svelte-6nh3sy");
    			add_location(dd0, file$6, 75, 2, 1738);
    			attr_dev(dt1, "class", "svelte-6nh3sy");
    			add_location(dt1, file$6, 85, 2, 1963);
    			if (/*editControl*/ ctx[0].paramB === void 0) add_render_callback(() => /*select1_change_handler_1*/ ctx[14].call(select1));
    			add_location(select1, file$6, 87, 3, 1991);
    			attr_dev(dd1, "class", "svelte-6nh3sy");
    			add_location(dd1, file$6, 86, 2, 1983);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, dt0, anchor);
    			insert_dev(target, dd0, anchor);
    			append_dev(dd0, select0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(select0, null);
    			}

    			select_option(select0, /*editControl*/ ctx[0].paramA);
    			append_dev(dd0, t1);
    			append_dev(dd0, t2);
    			append_dev(dd0, t3);
    			insert_dev(target, dt1, anchor);
    			insert_dev(target, dd1, anchor);
    			append_dev(dd1, select1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select1, null);
    			}

    			select_option(select1, /*editControl*/ ctx[0].paramB);

    			dispose = [
    				listen_dev(select0, "change", /*select0_change_handler_1*/ ctx[13]),
    				listen_dev(select0, "change", /*touchControl*/ ctx[6], false, false, false),
    				listen_dev(select1, "change", /*select1_change_handler_1*/ ctx[14]),
    				listen_dev(select1, "change", /*touchControl*/ ctx[6], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*possibleCCs*/ 8) {
    				each_value_1 = /*possibleCCs*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(select0, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty[0] & /*editControl*/ 1) {
    				select_option(select0, /*editControl*/ ctx[0].paramA);
    			}

    			if (dirty[0] & /*editControl*/ 1 && t2_value !== (t2_value = /*fromMidi*/ ctx[8](/*editControl*/ ctx[0].paramA) + "")) set_data_dev(t2, t2_value);

    			if (dirty[0] & /*possibleCCs*/ 8) {
    				each_value = /*possibleCCs*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*editControl*/ 1) {
    				select_option(select1, /*editControl*/ ctx[0].paramB);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(dt0);
    			if (detaching) detach_dev(dd0);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach_dev(dt1);
    			if (detaching) detach_dev(dd1);
    			destroy_each(each_blocks, detaching);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(74:0) {#if editControl.mode == \\\"1\\\"}",
    		ctx
    	});

    	return block;
    }

    // (100:1) {#each possibleCCs as CC}
    function create_each_block_3(ctx) {
    	let option;
    	let t_value = /*CC*/ ctx[17] + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*CC*/ ctx[17];
    			option.value = option.__value;
    			add_location(option, file$6, 100, 8, 2314);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(100:1) {#each possibleCCs as CC}",
    		ctx
    	});

    	return block;
    }

    // (110:1) {#each possibleCCs as CC}
    function create_each_block_2(ctx) {
    	let option;
    	let t_value = /*CC*/ ctx[17] + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*CC*/ ctx[17];
    			option.value = option.__value;
    			add_location(option, file$6, 110, 8, 2522);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(110:1) {#each possibleCCs as CC}",
    		ctx
    	});

    	return block;
    }

    // (78:1) {#each possibleCCs as CC}
    function create_each_block_1(ctx) {
    	let option;
    	let t_value = /*CC*/ ctx[17] + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*CC*/ ctx[17];
    			option.value = option.__value;
    			add_location(option, file$6, 78, 8, 1847);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(78:1) {#each possibleCCs as CC}",
    		ctx
    	});

    	return block;
    }

    // (89:1) {#each possibleCCs as CC}
    function create_each_block$1(ctx) {
    	let option;
    	let t_value = /*CC*/ ctx[17] + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*CC*/ ctx[17];
    			option.value = option.__value;
    			add_location(option, file$6, 89, 8, 2092);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(89:1) {#each possibleCCs as CC}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let dl;
    	let dt0;
    	let t0;
    	let t1_value = /*buttonNames*/ ctx[7][/*index*/ ctx[1]] + "";
    	let t1;
    	let dt1;
    	let dd0;
    	let select0;
    	let t3;
    	let dt2;
    	let dd1;
    	let select1;
    	let t5;
    	let dispose;
    	let each_value_5 = /*possibleChannels*/ ctx[2];
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_5.length; i += 1) {
    		each_blocks_1[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
    	}

    	let each_value_4 = /*possibleModes*/ ctx[4];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	function select_block_type(ctx, dirty) {
    		if (/*editControl*/ ctx[0].mode == "1") return create_if_block$3;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			dl = element("dl");
    			dt0 = element("dt");
    			t0 = text("Button ");
    			t1 = text(t1_value);
    			dt1 = element("dt");
    			dt1.textContent = "Channel";
    			dd0 = element("dd");
    			select0 = element("select");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t3 = space();
    			dt2 = element("dt");
    			dt2.textContent = "Mode";
    			dd1 = element("dd");
    			select1 = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t5 = space();
    			if_block.c();
    			attr_dev(dt0, "class", "index svelte-6nh3sy");
    			add_location(dt0, file$6, 52, 2, 1187);
    			attr_dev(dt1, "class", "svelte-6nh3sy");
    			add_location(dt1, file$6, 53, 2, 1240);
    			if (/*editControl*/ ctx[0].channel === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[11].call(select0));
    			add_location(select0, file$6, 55, 4, 1268);
    			attr_dev(dd0, "class", "svelte-6nh3sy");
    			add_location(dd0, file$6, 54, 2, 1259);
    			attr_dev(dt2, "class", "svelte-6nh3sy");
    			add_location(dt2, file$6, 62, 2, 1467);
    			if (/*editControl*/ ctx[0].mode === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[12].call(select1));
    			add_location(select1, file$6, 64, 3, 1491);
    			attr_dev(dd1, "class", "svelte-6nh3sy");
    			add_location(dd1, file$6, 63, 2, 1483);
    			attr_dev(dl, "class", "config-column svelte-6nh3sy");
    			add_location(dl, file$6, 51, 0, 1158);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, dl, anchor);
    			append_dev(dl, dt0);
    			append_dev(dt0, t0);
    			append_dev(dt0, t1);
    			append_dev(dl, dt1);
    			append_dev(dl, dd0);
    			append_dev(dd0, select0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(select0, null);
    			}

    			select_option(select0, /*editControl*/ ctx[0].channel);
    			append_dev(dd0, t3);
    			append_dev(dl, dt2);
    			append_dev(dl, dd1);
    			append_dev(dd1, select1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select1, null);
    			}

    			select_option(select1, /*editControl*/ ctx[0].mode);
    			append_dev(dd1, t5);
    			if_block.m(dl, null);

    			dispose = [
    				listen_dev(select0, "change", /*select0_change_handler*/ ctx[11]),
    				listen_dev(select0, "change", /*touchControl*/ ctx[6], false, false, false),
    				listen_dev(select1, "change", /*select1_change_handler*/ ctx[12]),
    				listen_dev(select1, "change", /*touchControl*/ ctx[6], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*index*/ 2 && t1_value !== (t1_value = /*buttonNames*/ ctx[7][/*index*/ ctx[1]] + "")) set_data_dev(t1, t1_value);

    			if (dirty[0] & /*possibleChannels*/ 4) {
    				each_value_5 = /*possibleChannels*/ ctx[2];
    				let i;

    				for (i = 0; i < each_value_5.length; i += 1) {
    					const child_ctx = get_each_context_5(ctx, each_value_5, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_5(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(select0, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_5.length;
    			}

    			if (dirty[0] & /*editControl*/ 1) {
    				select_option(select0, /*editControl*/ ctx[0].channel);
    			}

    			if (dirty[0] & /*possibleModes, modeNames*/ 48) {
    				each_value_4 = /*possibleModes*/ ctx[4];
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_4.length;
    			}

    			if (dirty[0] & /*editControl*/ 1) {
    				select_option(select1, /*editControl*/ ctx[0].mode);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(dl, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(dl);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			if_block.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $editConfiguration;
    	validate_store(editConfiguration, "editConfiguration");
    	component_subscribe($$self, editConfiguration, $$value => $$invalidate(9, $editConfiguration = $$value));
    	let { index } = $$props;
    	let { editControl } = $$props;
    	let possibleChannels = Array.from(Array(16).keys());
    	possibleChannels.forEach((c, i) => $$invalidate(2, possibleChannels[i] = c + 1, possibleChannels));
    	let possibleCCs = Array.from(Array(128).keys());
    	let possibleModes = Array.from(Array(2).keys());
    	let modeNames = ["CC", "Keyboard"];

    	function touchControl() {
    		editConfiguration.update(old => $editConfiguration);
    	}

    	let buttonNames = ["A", "B", "C", "D"];
    	let CHROMATIC = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

    	function fromMidi(midi) {
    		var name = CHROMATIC[midi % 12];
    		var oct = Math.floor(midi / 12) - 1;
    		return name + oct;
    	}

    	
    	const writable_props = ["index", "editControl"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<EditControlButton> was created with unknown prop '${key}'`);
    	});

    	function select0_change_handler() {
    		editControl.channel = select_value(this);
    		$$invalidate(0, editControl);
    		$$invalidate(2, possibleChannels);
    	}

    	function select1_change_handler() {
    		editControl.mode = select_value(this);
    		$$invalidate(0, editControl);
    		$$invalidate(2, possibleChannels);
    	}

    	function select0_change_handler_1() {
    		editControl.paramA = select_value(this);
    		$$invalidate(0, editControl);
    		$$invalidate(2, possibleChannels);
    	}

    	function select1_change_handler_1() {
    		editControl.paramB = select_value(this);
    		$$invalidate(0, editControl);
    		$$invalidate(2, possibleChannels);
    	}

    	function select0_change_handler_2() {
    		editControl.paramA = select_value(this);
    		$$invalidate(0, editControl);
    		$$invalidate(2, possibleChannels);
    	}

    	function select1_change_handler_2() {
    		editControl.paramB = select_value(this);
    		$$invalidate(0, editControl);
    		$$invalidate(2, possibleChannels);
    	}

    	$$self.$set = $$props => {
    		if ("index" in $$props) $$invalidate(1, index = $$props.index);
    		if ("editControl" in $$props) $$invalidate(0, editControl = $$props.editControl);
    	};

    	$$self.$capture_state = () => {
    		return {
    			index,
    			editControl,
    			possibleChannels,
    			possibleCCs,
    			possibleModes,
    			modeNames,
    			buttonNames,
    			CHROMATIC,
    			$editConfiguration
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("index" in $$props) $$invalidate(1, index = $$props.index);
    		if ("editControl" in $$props) $$invalidate(0, editControl = $$props.editControl);
    		if ("possibleChannels" in $$props) $$invalidate(2, possibleChannels = $$props.possibleChannels);
    		if ("possibleCCs" in $$props) $$invalidate(3, possibleCCs = $$props.possibleCCs);
    		if ("possibleModes" in $$props) $$invalidate(4, possibleModes = $$props.possibleModes);
    		if ("modeNames" in $$props) $$invalidate(5, modeNames = $$props.modeNames);
    		if ("buttonNames" in $$props) $$invalidate(7, buttonNames = $$props.buttonNames);
    		if ("CHROMATIC" in $$props) CHROMATIC = $$props.CHROMATIC;
    		if ("$editConfiguration" in $$props) editConfiguration.set($editConfiguration = $$props.$editConfiguration);
    	};

    	return [
    		editControl,
    		index,
    		possibleChannels,
    		possibleCCs,
    		possibleModes,
    		modeNames,
    		touchControl,
    		buttonNames,
    		fromMidi,
    		$editConfiguration,
    		CHROMATIC,
    		select0_change_handler,
    		select1_change_handler,
    		select0_change_handler_1,
    		select1_change_handler_1,
    		select0_change_handler_2,
    		select1_change_handler_2
    	];
    }

    class EditControlButton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { index: 1, editControl: 0 }, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EditControlButton",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*index*/ ctx[1] === undefined && !("index" in props)) {
    			console.warn("<EditControlButton> was created without expected prop 'index'");
    		}

    		if (/*editControl*/ ctx[0] === undefined && !("editControl" in props)) {
    			console.warn("<EditControlButton> was created without expected prop 'editControl'");
    		}
    	}

    	get index() {
    		throw new Error("<EditControlButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set index(value) {
    		throw new Error("<EditControlButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get editControl() {
    		throw new Error("<EditControlButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set editControl(value) {
    		throw new Error("<EditControlButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/DeviceOptions.svelte generated by Svelte v3.18.2 */
    const file$7 = "src/components/DeviceOptions.svelte";

    // (32:0) {#if $configuration.device().capabilities.led}
    function create_if_block_4(ctx) {
    	let updating_checked;
    	let t;
    	let updating_checked_1;
    	let current;

    	function checkoption0_checked_binding(value) {
    		/*checkoption0_checked_binding*/ ctx[3].call(null, value);
    	}

    	let checkoption0_props = {
    		$$slots: { default: [create_default_slot_4] },
    		$$scope: { ctx }
    	};

    	if (/*$editConfiguration*/ ctx[0].faderBlink !== void 0) {
    		checkoption0_props.checked = /*$editConfiguration*/ ctx[0].faderBlink;
    	}

    	const checkoption0 = new CheckOption({
    			props: checkoption0_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(checkoption0, "checked", checkoption0_checked_binding));

    	function checkoption1_checked_binding(value_1) {
    		/*checkoption1_checked_binding*/ ctx[4].call(null, value_1);
    	}

    	let checkoption1_props = {
    		$$slots: { default: [create_default_slot_3] },
    		$$scope: { ctx }
    	};

    	if (/*$editConfiguration*/ ctx[0].accelBlink !== void 0) {
    		checkoption1_props.checked = /*$editConfiguration*/ ctx[0].accelBlink;
    	}

    	const checkoption1 = new CheckOption({
    			props: checkoption1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(checkoption1, "checked", checkoption1_checked_binding));

    	const block = {
    		c: function create() {
    			create_component(checkoption0.$$.fragment);
    			t = space();
    			create_component(checkoption1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(checkoption0, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(checkoption1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const checkoption0_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				checkoption0_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_checked && dirty & /*$editConfiguration*/ 1) {
    				updating_checked = true;
    				checkoption0_changes.checked = /*$editConfiguration*/ ctx[0].faderBlink;
    				add_flush_callback(() => updating_checked = false);
    			}

    			checkoption0.$set(checkoption0_changes);
    			const checkoption1_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				checkoption1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_checked_1 && dirty & /*$editConfiguration*/ 1) {
    				updating_checked_1 = true;
    				checkoption1_changes.checked = /*$editConfiguration*/ ctx[0].accelBlink;
    				add_flush_callback(() => updating_checked_1 = false);
    			}

    			checkoption1.$set(checkoption1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(checkoption0.$$.fragment, local);
    			transition_in(checkoption1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(checkoption0.$$.fragment, local);
    			transition_out(checkoption1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(checkoption0, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(checkoption1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(32:0) {#if $configuration.device().capabilities.led}",
    		ctx
    	});

    	return block;
    }

    // (33:0) <CheckOption bind:checked={$editConfiguration.faderBlink}>
    function create_default_slot_4(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Blink LEDs on fader movements");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4.name,
    		type: "slot",
    		source: "(33:0) <CheckOption bind:checked={$editConfiguration.faderBlink}>",
    		ctx
    	});

    	return block;
    }

    // (37:0) <CheckOption bind:checked={$editConfiguration.accelBlink}>
    function create_default_slot_3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Blink LEDs on accelerometer movements");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(37:0) <CheckOption bind:checked={$editConfiguration.accelBlink}>",
    		ctx
    	});

    	return block;
    }

    // (42:0) <CheckOption bind:checked={$editConfiguration.controllerFlip}>
    function create_default_slot_2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Rotate controller 180º");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(42:0) <CheckOption bind:checked={$editConfiguration.controllerFlip}>",
    		ctx
    	});

    	return block;
    }

    // (46:0) <CheckOption bind:checked={$editConfiguration.midiThru}>
    function create_default_slot_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Soft MIDI thru (echo MIDI clock/note data sent to USB out of the minijack)");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(46:0) <CheckOption bind:checked={$editConfiguration.midiThru}>",
    		ctx
    	});

    	return block;
    }

    // (53:39) 
    function create_if_block_3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Midi Type A (Make Noise, Intellijel)");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(53:39) ",
    		ctx
    	});

    	return block;
    }

    // (51:2) {#if $editConfiguration.midiMode}
    function create_if_block_2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Midi Type B (Arturia)");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(51:2) {#if $editConfiguration.midiMode}",
    		ctx
    	});

    	return block;
    }

    // (50:0) <CheckOption bind:checked={$editConfiguration.midiMode}>
    function create_default_slot(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*$editConfiguration*/ ctx[0].midiMode) return create_if_block_2;
    		if (!/*$editConfiguration*/ ctx[0].midiMode) return create_if_block_3;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) {
    				if_block.d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(50:0) <CheckOption bind:checked={$editConfiguration.midiMode}>",
    		ctx
    	});

    	return block;
    }

    // (73:0) {:else}
    function create_else_block$2(ctx) {
    	let div0;
    	let label0;
    	let t1;
    	let input0;
    	let input0_max_value;
    	let input0_updating = false;
    	let t2;
    	let div1;
    	let label1;
    	let t4;
    	let input1;
    	let input1_max_value;
    	let input1_updating = false;
    	let t5;
    	let p;
    	let t6;
    	let code;
    	let t8;
    	let br0;
    	let br1;
    	let t9;
    	let br2;
    	let t10;
    	let br3;
    	let t11;
    	let br4;
    	let t12;
    	let br5;
    	let t13;
    	let br6;
    	let t14;
    	let dispose;

    	function input0_input_handler() {
    		input0_updating = true;
    		/*input0_input_handler*/ ctx[8].call(input0);
    	}

    	function input1_input_handler() {
    		input1_updating = true;
    		/*input1_input_handler*/ ctx[9].call(input1);
    	}

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "Fader Minimum raw value";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			div1 = element("div");
    			label1 = element("label");
    			label1.textContent = "Fader Maximum raw value";
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			p = element("p");
    			t6 = text("Every fader is slightly different - depending on conditions when it was manufactured. You shouldn't touch this unless you are having issues with your faders either reaching ");
    			code = element("code");
    			code.textContent = "127";
    			t8 = text(" before the end of their travel, or not at all. ");
    			br0 = element("br");
    			br1 = element("br");
    			t9 = text("\n  NB: these instructions are quite counter-intuitive, so read this carefully!");
    			br2 = element("br");
    			t10 = text(" \n\n•  \"Raw\" analog values are read from the faders between 0 and 4096. ");
    			br3 = element("br");
    			t11 = text("\n•  For Reasons, the Fader Maximum value relates to the BOTTOM of the fader range (assuming the USB cable is on the right so the controller is not in 'flipped' mode). The Fader Minimum relates to the TOP of the range.");
    			br4 = element("br");
    			t12 = text("\n•  If when you pull the fader down, it sticks at 1 or 2 or more, so doesn't get all the way to 0, you should reduce the Fader Maximum value, maybe to 4080.");
    			br5 = element("br");
    			t13 = text("\n•  If when you push the fader up, it stick at 126, 125 or less, so doesn't get all the way to 127, you should increase the Fader Minimum value, maybe to 100.");
    			br6 = element("br");
    			t14 = text("\n•  Defaults are Min = 15, Max = 4080.");
    			attr_dev(label0, "class", "svelte-idpdcv");
    			add_location(label0, file$7, 74, 2, 1482);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "min", "0");
    			attr_dev(input0, "max", input0_max_value = (1 << 13) - 1);
    			add_location(input0, file$7, 75, 2, 1523);
    			add_location(div0, file$7, 73, 0, 1474);
    			attr_dev(label1, "class", "svelte-idpdcv");
    			add_location(label1, file$7, 83, 2, 1678);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "min", "0");
    			attr_dev(input1, "max", input1_max_value = (1 << 13) - 1);
    			add_location(input1, file$7, 84, 2, 1719);
    			add_location(div1, file$7, 82, 0, 1670);
    			add_location(code, file$7, 94, 175, 2060);
    			add_location(br0, file$7, 94, 239, 2124);
    			add_location(br1, file$7, 94, 244, 2129);
    			add_location(br2, file$7, 95, 77, 2212);
    			add_location(br3, file$7, 97, 74, 2295);
    			add_location(br4, file$7, 98, 222, 2523);
    			add_location(br5, file$7, 99, 161, 2691);
    			add_location(br6, file$7, 100, 163, 2861);
    			attr_dev(p, "class", "note svelte-idpdcv");
    			add_location(p, file$7, 93, 0, 1868);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, label0);
    			append_dev(div0, t1);
    			append_dev(div0, input0);
    			set_input_value(input0, /*$editConfiguration*/ ctx[0].fadermin);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, label1);
    			append_dev(div1, t4);
    			append_dev(div1, input1);
    			set_input_value(input1, /*$editConfiguration*/ ctx[0].fadermax);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, p, anchor);
    			append_dev(p, t6);
    			append_dev(p, code);
    			append_dev(p, t8);
    			append_dev(p, br0);
    			append_dev(p, br1);
    			append_dev(p, t9);
    			append_dev(p, br2);
    			append_dev(p, t10);
    			append_dev(p, br3);
    			append_dev(p, t11);
    			append_dev(p, br4);
    			append_dev(p, t12);
    			append_dev(p, br5);
    			append_dev(p, t13);
    			append_dev(p, br6);
    			append_dev(p, t14);

    			dispose = [
    				listen_dev(input0, "input", input0_input_handler),
    				listen_dev(input0, "change", /*touchControl*/ ctx[2], false, false, false),
    				listen_dev(input1, "input", input1_input_handler),
    				listen_dev(input1, "change", /*touchControl*/ ctx[2], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (!input0_updating && dirty & /*$editConfiguration*/ 1) {
    				set_input_value(input0, /*$editConfiguration*/ ctx[0].fadermin);
    			}

    			input0_updating = false;

    			if (!input1_updating && dirty & /*$editConfiguration*/ 1) {
    				set_input_value(input1, /*$editConfiguration*/ ctx[0].fadermax);
    			}

    			input1_updating = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(p);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(73:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (69:0) {#if $configuration.pageNumber > 0}
    function create_if_block_1$1(ctx) {
    	let b;

    	const block = {
    		c: function create() {
    			b = element("b");
    			b.textContent = "NB: Fader Calibration is global, and can only be changed in Bank 1";
    			add_location(b, file$7, 70, 0, 1391);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, b, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(b);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(69:0) {#if $configuration.pageNumber > 0}",
    		ctx
    	});

    	return block;
    }

    // (114:0) {#if $configuration.device().capabilities.i2c}
    function create_if_block$4(ctx) {
    	let hr;
    	let t0;
    	let h3;
    	let t2;
    	let select;
    	let option0;
    	let option0_value_value;
    	let option1;
    	let option1_value_value;
    	let t5;
    	let p0;
    	let strong0;
    	let t7;
    	let t8;
    	let p1;
    	let strong1;
    	let t10;
    	let t11;
    	let p2;
    	let t13;
    	let p3;
    	let dispose;

    	const block = {
    		c: function create() {
    			hr = element("hr");
    			t0 = space();
    			h3 = element("h3");
    			h3.textContent = "I2C Leader/Follower";
    			t2 = space();
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Follower";
    			option1 = element("option");
    			option1.textContent = "Leader";
    			t5 = space();
    			p0 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Follower";
    			t7 = text(" mode is for use with Teletype.");
    			t8 = space();
    			p1 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Leader";
    			t10 = text(" mode is for use with Ansible, TXo, ER-301. 16n will not respond to Teletype when in leader mode.");
    			t11 = space();
    			p2 = element("p");
    			p2.textContent = "This will not take effect until you restart (disconnect/reconnect) your 16n.";
    			t13 = space();
    			p3 = element("p");
    			p3.textContent = "(\"Leader\" is sometimes also referred to as 'master' mode)";
    			add_location(hr, file$7, 114, 0, 2984);
    			add_location(h3, file$7, 115, 0, 2991);
    			option0.__value = option0_value_value = false;
    			option0.value = option0.__value;
    			add_location(option0, file$7, 117, 2, 3098);
    			option1.__value = option1_value_value = true;
    			option1.value = option1.__value;
    			add_location(option1, file$7, 118, 2, 3140);
    			if (/*$editConfiguration*/ ctx[0].i2cMaster === void 0) add_render_callback(() => /*select_change_handler*/ ctx[10].call(select));
    			add_location(select, file$7, 116, 0, 3020);
    			add_location(strong0, file$7, 121, 16, 3204);
    			attr_dev(p0, "class", "note svelte-idpdcv");
    			add_location(p0, file$7, 121, 0, 3188);
    			add_location(strong1, file$7, 122, 16, 3281);
    			attr_dev(p1, "class", "note svelte-idpdcv");
    			add_location(p1, file$7, 122, 0, 3265);
    			attr_dev(p2, "class", "note svelte-idpdcv");
    			add_location(p2, file$7, 123, 0, 3406);
    			attr_dev(p3, "class", "note small svelte-idpdcv");
    			add_location(p3, file$7, 124, 0, 3503);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, hr, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, select, anchor);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			select_option(select, /*$editConfiguration*/ ctx[0].i2cMaster);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, p0, anchor);
    			append_dev(p0, strong0);
    			append_dev(p0, t7);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, strong1);
    			append_dev(p1, t10);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p3, anchor);

    			dispose = [
    				listen_dev(select, "change", /*select_change_handler*/ ctx[10]),
    				listen_dev(select, "change", /*touchControl*/ ctx[2], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$editConfiguration*/ 1) {
    				select_option(select, /*$editConfiguration*/ ctx[0].i2cMaster);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(hr);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(select);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(p2);
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(p3);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(114:0) {#if $configuration.device().capabilities.i2c}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let show_if_1 = /*$configuration*/ ctx[1].device().capabilities.led;
    	let t0;
    	let updating_checked;
    	let t1;
    	let updating_checked_1;
    	let t2;
    	let updating_checked_2;
    	let t3;
    	let hr;
    	let t4;
    	let h3;
    	let t6;
    	let t7;
    	let show_if = /*$configuration*/ ctx[1].device().capabilities.i2c;
    	let if_block2_anchor;
    	let current;
    	let if_block0 = show_if_1 && create_if_block_4(ctx);

    	function checkoption0_checked_binding_1(value) {
    		/*checkoption0_checked_binding_1*/ ctx[5].call(null, value);
    	}

    	let checkoption0_props = {
    		$$slots: { default: [create_default_slot_2] },
    		$$scope: { ctx }
    	};

    	if (/*$editConfiguration*/ ctx[0].controllerFlip !== void 0) {
    		checkoption0_props.checked = /*$editConfiguration*/ ctx[0].controllerFlip;
    	}

    	const checkoption0 = new CheckOption({
    			props: checkoption0_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(checkoption0, "checked", checkoption0_checked_binding_1));

    	function checkoption1_checked_binding_1(value_1) {
    		/*checkoption1_checked_binding_1*/ ctx[6].call(null, value_1);
    	}

    	let checkoption1_props = {
    		$$slots: { default: [create_default_slot_1] },
    		$$scope: { ctx }
    	};

    	if (/*$editConfiguration*/ ctx[0].midiThru !== void 0) {
    		checkoption1_props.checked = /*$editConfiguration*/ ctx[0].midiThru;
    	}

    	const checkoption1 = new CheckOption({
    			props: checkoption1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(checkoption1, "checked", checkoption1_checked_binding_1));

    	function checkoption2_checked_binding(value_2) {
    		/*checkoption2_checked_binding*/ ctx[7].call(null, value_2);
    	}

    	let checkoption2_props = {
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	};

    	if (/*$editConfiguration*/ ctx[0].midiMode !== void 0) {
    		checkoption2_props.checked = /*$editConfiguration*/ ctx[0].midiMode;
    	}

    	const checkoption2 = new CheckOption({
    			props: checkoption2_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(checkoption2, "checked", checkoption2_checked_binding));

    	function select_block_type_1(ctx, dirty) {
    		if (/*$configuration*/ ctx[1].pageNumber > 0) return create_if_block_1$1;
    		return create_else_block$2;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block1 = current_block_type(ctx);
    	let if_block2 = show_if && create_if_block$4(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			create_component(checkoption0.$$.fragment);
    			t1 = space();
    			create_component(checkoption1.$$.fragment);
    			t2 = space();
    			create_component(checkoption2.$$.fragment);
    			t3 = space();
    			hr = element("hr");
    			t4 = space();
    			h3 = element("h3");
    			h3.textContent = "Fader calibration";
    			t6 = space();
    			if_block1.c();
    			t7 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    			add_location(hr, file$7, 64, 0, 1319);
    			add_location(h3, file$7, 66, 0, 1326);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(checkoption0, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(checkoption1, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(checkoption2, target, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, hr, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t6, anchor);
    			if_block1.m(target, anchor);
    			insert_dev(target, t7, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert_dev(target, if_block2_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$configuration*/ 2) show_if_1 = /*$configuration*/ ctx[1].device().capabilities.led;

    			if (show_if_1) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    					transition_in(if_block0, 1);
    				} else {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			const checkoption0_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				checkoption0_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_checked && dirty & /*$editConfiguration*/ 1) {
    				updating_checked = true;
    				checkoption0_changes.checked = /*$editConfiguration*/ ctx[0].controllerFlip;
    				add_flush_callback(() => updating_checked = false);
    			}

    			checkoption0.$set(checkoption0_changes);
    			const checkoption1_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				checkoption1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_checked_1 && dirty & /*$editConfiguration*/ 1) {
    				updating_checked_1 = true;
    				checkoption1_changes.checked = /*$editConfiguration*/ ctx[0].midiThru;
    				add_flush_callback(() => updating_checked_1 = false);
    			}

    			checkoption1.$set(checkoption1_changes);
    			const checkoption2_changes = {};

    			if (dirty & /*$$scope, $editConfiguration*/ 2049) {
    				checkoption2_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_checked_2 && dirty & /*$editConfiguration*/ 1) {
    				updating_checked_2 = true;
    				checkoption2_changes.checked = /*$editConfiguration*/ ctx[0].midiMode;
    				add_flush_callback(() => updating_checked_2 = false);
    			}

    			checkoption2.$set(checkoption2_changes);

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(t7.parentNode, t7);
    				}
    			}

    			if (dirty & /*$configuration*/ 2) show_if = /*$configuration*/ ctx[1].device().capabilities.i2c;

    			if (show_if) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block$4(ctx);
    					if_block2.c();
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(checkoption0.$$.fragment, local);
    			transition_in(checkoption1.$$.fragment, local);
    			transition_in(checkoption2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(checkoption0.$$.fragment, local);
    			transition_out(checkoption1.$$.fragment, local);
    			transition_out(checkoption2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(checkoption0, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(checkoption1, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(checkoption2, detaching);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(hr);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t6);
    			if_block1.d(detaching);
    			if (detaching) detach_dev(t7);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach_dev(if_block2_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $editConfiguration;
    	let $configuration;
    	validate_store(editConfiguration, "editConfiguration");
    	component_subscribe($$self, editConfiguration, $$value => $$invalidate(0, $editConfiguration = $$value));
    	validate_store(configuration, "configuration");
    	component_subscribe($$self, configuration, $$value => $$invalidate(1, $configuration = $$value));

    	function touchControl() {
    		editConfiguration.update(old => $editConfiguration);
    	}

    	function checkoption0_checked_binding(value) {
    		$editConfiguration.faderBlink = value;
    		editConfiguration.set($editConfiguration);
    	}

    	function checkoption1_checked_binding(value_1) {
    		$editConfiguration.accelBlink = value_1;
    		editConfiguration.set($editConfiguration);
    	}

    	function checkoption0_checked_binding_1(value) {
    		$editConfiguration.controllerFlip = value;
    		editConfiguration.set($editConfiguration);
    	}

    	function checkoption1_checked_binding_1(value_1) {
    		$editConfiguration.midiThru = value_1;
    		editConfiguration.set($editConfiguration);
    	}

    	function checkoption2_checked_binding(value_2) {
    		$editConfiguration.midiMode = value_2;
    		editConfiguration.set($editConfiguration);
    	}

    	function input0_input_handler() {
    		$editConfiguration.fadermin = to_number(this.value);
    		editConfiguration.set($editConfiguration);
    	}

    	function input1_input_handler() {
    		$editConfiguration.fadermax = to_number(this.value);
    		editConfiguration.set($editConfiguration);
    	}

    	function select_change_handler() {
    		$editConfiguration.i2cMaster = select_value(this);
    		editConfiguration.set($editConfiguration);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("$editConfiguration" in $$props) editConfiguration.set($editConfiguration = $$props.$editConfiguration);
    		if ("$configuration" in $$props) configuration.set($configuration = $$props.$configuration);
    	};

    	return [
    		$editConfiguration,
    		$configuration,
    		touchControl,
    		checkoption0_checked_binding,
    		checkoption1_checked_binding,
    		checkoption0_checked_binding_1,
    		checkoption1_checked_binding_1,
    		checkoption2_checked_binding,
    		input0_input_handler,
    		input1_input_handler,
    		select_change_handler
    	];
    }

    class DeviceOptions extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DeviceOptions",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/components/MidiContext.svelte generated by Svelte v3.18.2 */

    const file$8 = "src/components/MidiContext.svelte";

    function create_fragment$8(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[13].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[12], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			add_location(div, file$8, 192, 0, 5681);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 4096) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[12], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[12], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let $selectedMidiInput;
    	let $selectedMidiOutput;
    	let $configuration;
    	let $midiInputs;
    	let $midiOutputs;
    	let $editMode;
    	validate_store(selectedMidiInput, "selectedMidiInput");
    	component_subscribe($$self, selectedMidiInput, $$value => $$invalidate(0, $selectedMidiInput = $$value));
    	validate_store(selectedMidiOutput, "selectedMidiOutput");
    	component_subscribe($$self, selectedMidiOutput, $$value => $$invalidate(1, $selectedMidiOutput = $$value));
    	validate_store(configuration, "configuration");
    	component_subscribe($$self, configuration, $$value => $$invalidate(2, $configuration = $$value));
    	validate_store(midiInputs, "midiInputs");
    	component_subscribe($$self, midiInputs, $$value => $$invalidate(3, $midiInputs = $$value));
    	validate_store(midiOutputs, "midiOutputs");
    	component_subscribe($$self, midiOutputs, $$value => $$invalidate(4, $midiOutputs = $$value));
    	validate_store(editMode, "editMode");
    	component_subscribe($$self, editMode, $$value => $$invalidate(5, $editMode = $$value));

    	webmidi_min.enable(
    		function (err) {
    			if (err) {
    				logger("WebMidi could not be enabled.", err);
    			} else {
    				logger("WebMidi enabled!");
    				webMidiEnabled.update(old => true);
    				setupMidiHeartBeat();
    			}
    		},
    		true
    	); // enable sysex

    	function setupMidiHeartBeat() {
    		logger("Setting up heartbeat");
    		doMidiHeartBeat();

    		webmidi_min.addListener("connected", e => {
    			// logger('connected event', e)
    			midiInputs.set(OxionMidi.allInputs(webmidi_min));

    			midiOutputs.set(OxionMidi.allOutputs(webmidi_min));

    			// ToDO TODO
    			// if there's not a midi input, and there is now one with a name of 16n, set it
    			// if there's not a midi output, and there is now one with a name of 16n, set it
    			selectedMidiInput.update(i => $selectedMidiInput);

    			selectedMidiOutput.update(i => $selectedMidiOutput);
    			doMidiHeartBeat();
    		});

    		webmidi_min.addListener("disconnected", e => {
    			// logger('disconnected event', e)
    			midiInputs.set(OxionMidi.allInputs(webmidi_min));

    			midiOutputs.set(OxionMidi.allOutputs(webmidi_min));

    			// if($midiInputs.length > 0) {
    			// selectedMidiInput.update(i => $midiInputs[0]);
    			// logger($midiInputs);
    			// } else {
    			selectedMidiInput.update(i => null);

    			// }
    			// if($midiOutputs.length > 0) {
    			// selectedMidiOutput.update(i => $midiOutputs[0]);
    			// logger($midiOutputs);
    			// } else {
    			selectedMidiOutput.update(i => null);

    			// }
    			set_store_value(configuration, $configuration = null);

    			doMidiHeartBeat();
    		});

    		setInterval(
    			() => {
    				doMidiHeartBeat();
    			},
    			1000
    		); // Changed interval from 5000 to 1000 to make more responsive to bank changes
    	}

    	function doMidiHeartBeat() {
    		if (!$selectedMidiInput && $midiInputs.length > 0) {
    			// TODO TODO if 16
    			// Now checks for either 16n or 'Music' midi input 
    			let sixteenN = $midiInputs.find(input => input.name.match(/.*16n.*/));

    			let mtmN = $midiInputs.find(input => input.name.match(/.*Music.*/));

    			if (sixteenN) {
    				selectedMidiInput.update(i => sixteenN);
    			}

    			if (mtmN) {
    				selectedMidiInput.update(i => mtmN);
    			}
    		}

    		if (!$selectedMidiOutput && $midiOutputs.length > 0) {
    			// TODO TODO if 16n
    			// Now checks for either 16n or 'Music' midi output 
    			let sixteenN = $midiOutputs.find(output => output.name.match(/.*16n.*/));

    			let mtmN = $midiOutputs.find(output => output.name.match(/.*Music.*/));

    			if (sixteenN) {
    				selectedMidiOutput.update(i => sixteenN);
    			}

    			if (mtmN) {
    				selectedMidiOutput.update(i => mtmN);
    			}
    		}

    		// this change allows heartbeat to continue - repeatedly asking the device for configuration so long as it's attached. 
    		//     if (!$configuration && $selectedMidiInput && $selectedMidiOutput) {
    		if ($selectedMidiInput && $selectedMidiOutput) {
    			listenForCC($selectedMidiInput);
    			listenForSysex($selectedMidiInput);
    			logger("Hearbeat requesting config.");
    			requestConfig();
    		}
    	}

    	selectedMidiInput.subscribe(newInput => {
    		if (newInput) {
    			$midiInputs.forEach(input => {
    				input.removeListener();
    			});

    			listenForCC(newInput);
    			listenForSysex(newInput);
    			configuration.update(n => null);
    			requestConfig();
    		}
    	});

    	selectedMidiOutput.subscribe(newOutput => {
    		if (newOutput) {
    			configuration.update(n => null);
    			requestConfig();
    		}
    	});

    	function controllerMoved(event) {
    		if ($configuration) {
    			$configuration.usbControls.forEach(c => {
    				if (c.channel == event.channel && c.cc == event.controller.number) {
    					c.val = event.value;
    				}
    			});

    			configuration.update(c => $configuration); // trigger reactivity
    		}
    	}

    	function listenForCC(input) {
    		input.addListener("controlchange", "all", e => {
    			controllerMoved(e);
    		});
    	}

    	function listenForSysex(input) {
    		input.addListener("sysex", "all", e => {
    			let data = e.data;

    			if (!OxionMidi.isOxionSysex(data)) {
    				logger("Sysex not for us:", data);
    				return;
    			}

    			if (data[4] == 15) {
    				// it's an c0nFig message!
    				logger("it's a c0nFig message");

    				let configBytes = [];

    				data.slice(5, data.length - 1).forEach(d => {
    					configBytes.push(d.toString(16).padStart(2, "0"));
    				});

    				configuration.update(n => ConfigurationObject.returnConfigHashFromSysex(data));

    				if ($editMode) {
    					let oldConfig = ConfigurationObject.clone($configuration);
    					editConfiguration.update(c => oldConfig);
    				}

    				logger("Received config", $configuration);

    				if (document.getElementById("current_config")) {
    					document.getElementById("current_config").value = configBytes.join(" ");
    				}
    			}
    		});

    		logger("Attached sysex listener to ", input.name);
    	}

    	function requestConfig() {
    		if ($selectedMidiInput && $selectedMidiOutput) {
    			logger("Requesting config over " + $selectedMidiOutput.name);
    			logger("Hoping to receive on " + $selectedMidiInput.name);
    			OxionMidi.requestConfig($selectedMidiOutput);
    		}
    	}

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(12, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("$selectedMidiInput" in $$props) selectedMidiInput.set($selectedMidiInput = $$props.$selectedMidiInput);
    		if ("$selectedMidiOutput" in $$props) selectedMidiOutput.set($selectedMidiOutput = $$props.$selectedMidiOutput);
    		if ("$configuration" in $$props) configuration.set($configuration = $$props.$configuration);
    		if ("$midiInputs" in $$props) midiInputs.set($midiInputs = $$props.$midiInputs);
    		if ("$midiOutputs" in $$props) midiOutputs.set($midiOutputs = $$props.$midiOutputs);
    		if ("$editMode" in $$props) editMode.set($editMode = $$props.$editMode);
    	};

    	return [
    		$selectedMidiInput,
    		$selectedMidiOutput,
    		$configuration,
    		$midiInputs,
    		$midiOutputs,
    		$editMode,
    		setupMidiHeartBeat,
    		doMidiHeartBeat,
    		controllerMoved,
    		listenForCC,
    		listenForSysex,
    		requestConfig,
    		$$scope,
    		$$slots
    	];
    }

    class MidiContext extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MidiContext",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/components/MidiEnabled.svelte generated by Svelte v3.18.2 */
    const file$9 = "src/components/MidiEnabled.svelte";

    // (12:19) 
    function create_if_block_1$2(ctx) {
    	let p;
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(/*fallback*/ ctx[0]);
    			add_location(p, file$9, 12, 2, 167);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*fallback*/ 1) set_data_dev(t, /*fallback*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(12:19) ",
    		ctx
    	});

    	return block;
    }

    // (10:0) {#if $webMidiEnabled}
    function create_if_block$5(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 4) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[2], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(10:0) {#if $webMidiEnabled}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$5, create_if_block_1$2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$webMidiEnabled*/ ctx[1]) return 0;
    		if (/*fallback*/ ctx[0]) return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(target, anchor);
    			}

    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}

    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let $webMidiEnabled;
    	validate_store(webMidiEnabled, "webMidiEnabled");
    	component_subscribe($$self, webMidiEnabled, $$value => $$invalidate(1, $webMidiEnabled = $$value));
    	let { fallback = null } = $$props;
    	const writable_props = ["fallback"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<MidiEnabled> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("fallback" in $$props) $$invalidate(0, fallback = $$props.fallback);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { fallback, $webMidiEnabled };
    	};

    	$$self.$inject_state = $$props => {
    		if ("fallback" in $$props) $$invalidate(0, fallback = $$props.fallback);
    		if ("$webMidiEnabled" in $$props) webMidiEnabled.set($webMidiEnabled = $$props.$webMidiEnabled);
    	};

    	return [fallback, $webMidiEnabled, $$scope, $$slots];
    }

    class MidiEnabled extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { fallback: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MidiEnabled",
    			options,
    			id: create_fragment$9.name
    		});
    	}

    	get fallback() {
    		throw new Error("<MidiEnabled>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fallback(value) {
    		throw new Error("<MidiEnabled>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Subhead.svelte generated by Svelte v3.18.2 */

    const file$a = "src/components/Subhead.svelte";

    function create_fragment$a(ctx) {
    	let div1;
    	let h2;
    	let t0;
    	let t1;
    	let div0;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h2 = element("h2");
    			t0 = text(/*title*/ ctx[0]);
    			t1 = space();
    			div0 = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(h2, "class", "svelte-1o2kpty");
    			add_location(h2, file$a, 25, 2, 274);
    			attr_dev(div0, "class", "details svelte-1o2kpty");
    			add_location(div0, file$a, 28, 2, 301);
    			attr_dev(div1, "class", "subhead svelte-1o2kpty");
    			add_location(div1, file$a, 24, 0, 250);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h2);
    			append_dev(h2, t0);
    			append_dev(div1, t1);
    			append_dev(div1, div0);

    			if (default_slot) {
    				default_slot.m(div0, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*title*/ 1) set_data_dev(t0, /*title*/ ctx[0]);

    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 2) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[1], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { title } = $$props;
    	const writable_props = ["title"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Subhead> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { title };
    	};

    	$$self.$inject_state = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    	};

    	return [title, $$scope, $$slots];
    }

    class Subhead extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, { title: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Subhead",
    			options,
    			id: create_fragment$a.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*title*/ ctx[0] === undefined && !("title" in props)) {
    			console.warn("<Subhead> was created without expected prop 'title'");
    		}
    	}

    	get title() {
    		throw new Error("<Subhead>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Subhead>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/tabs/Tabs.svelte generated by Svelte v3.18.2 */
    const file$b = "src/components/tabs/Tabs.svelte";

    function create_fragment$b(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "tabs");
    			add_location(div, file$b, 47, 0, 1063);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 16) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[4], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const TABS = {};

    function instance$b($$self, $$props, $$invalidate) {
    	const tabs = [];
    	const panels = [];
    	const selectedTab = writable(null);
    	const selectedPanel = writable(null);

    	setContext(TABS, {
    		registerTab: tab => {
    			tabs.push(tab);
    			selectedTab.update(current => current || tab);

    			onDestroy(() => {
    				const i = tabs.indexOf(tab);
    				tabs.splice(i, 1);

    				selectedTab.update(current => current === tab
    				? tabs[i] || tabs[tabs.length - 1]
    				: current);
    			});
    		},
    		registerPanel: panel => {
    			panels.push(panel);
    			selectedPanel.update(current => current || panel);

    			onDestroy(() => {
    				const i = panels.indexOf(panel);
    				panels.splice(i, 1);

    				selectedPanel.update(current => current === panel
    				? panels[i] || panels[panels.length - 1]
    				: current);
    			});
    		},
    		selectTab: tab => {
    			const i = tabs.indexOf(tab);
    			selectedTab.set(tab);
    			selectedPanel.set(panels[i]);
    		},
    		selectedTab,
    		selectedPanel
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		
    	};

    	return [tabs, panels, selectedTab, selectedPanel, $$scope, $$slots];
    }

    class Tabs extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tabs",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src/components/tabs/TabList.svelte generated by Svelte v3.18.2 */

    const file$c = "src/components/tabs/TabList.svelte";

    function create_fragment$c(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "tab-list svelte-w6hq5a");
    			add_location(div, file$c, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 1) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[0], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		
    	};

    	return [$$scope, $$slots];
    }

    class TabList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TabList",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* src/components/tabs/TabPanel.svelte generated by Svelte v3.18.2 */

    // (11:0) {#if $selectedPanel === panel}
    function create_if_block$6(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 16) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[4], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$6.name,
    		type: "if",
    		source: "(11:0) {#if $selectedPanel === panel}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$d(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*$selectedPanel*/ ctx[0] === /*panel*/ ctx[1] && create_if_block$6(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$selectedPanel*/ ctx[0] === /*panel*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$6(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let $selectedPanel;
    	const panel = {};
    	const { registerPanel, selectedPanel } = getContext(TABS);
    	validate_store(selectedPanel, "selectedPanel");
    	component_subscribe($$self, selectedPanel, value => $$invalidate(0, $selectedPanel = value));
    	registerPanel(panel);
    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("$selectedPanel" in $$props) selectedPanel.set($selectedPanel = $$props.$selectedPanel);
    	};

    	return [$selectedPanel, panel, selectedPanel, registerPanel, $$scope, $$slots];
    }

    class TabPanel extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TabPanel",
    			options,
    			id: create_fragment$d.name
    		});
    	}
    }

    /* src/components/tabs/Tab.svelte generated by Svelte v3.18.2 */
    const file$d = "src/components/tabs/Tab.svelte";

    function create_fragment$e(ctx) {
    	let button;
    	let current;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

    	const block = {
    		c: function create() {
    			button = element("button");
    			if (default_slot) default_slot.c();
    			attr_dev(button, "class", "svelte-1y3smnx");
    			toggle_class(button, "selected", /*$selectedTab*/ ctx[0] === /*tab*/ ctx[1]);
    			add_location(button, file$d, 42, 0, 822);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (default_slot) {
    				default_slot.m(button, null);
    			}

    			current = true;
    			dispose = listen_dev(button, "click", /*click_handler*/ ctx[7], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 32) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[5], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null));
    			}

    			if (dirty & /*$selectedTab, tab*/ 3) {
    				toggle_class(button, "selected", /*$selectedTab*/ ctx[0] === /*tab*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (default_slot) default_slot.d(detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let $selectedTab;
    	const tab = {};
    	const { registerTab, selectTab, selectedTab } = getContext(TABS);
    	validate_store(selectedTab, "selectedTab");
    	component_subscribe($$self, selectedTab, value => $$invalidate(0, $selectedTab = value));
    	registerTab(tab);
    	let { $$slots = {}, $$scope } = $$props;
    	const click_handler = () => selectTab(tab);

    	$$self.$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(5, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("$selectedTab" in $$props) selectedTab.set($selectedTab = $$props.$selectedTab);
    	};

    	return [
    		$selectedTab,
    		tab,
    		selectTab,
    		selectedTab,
    		registerTab,
    		$$scope,
    		$$slots,
    		click_handler
    	];
    }

    class Tab extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tab",
    			options,
    			id: create_fragment$e.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.18.2 */
    const file$e = "src/App.svelte";

    function get_each_context_4$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	child_ctx[13] = i;
    	return child_ctx;
    }

    function get_each_context_5$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	child_ctx[13] = i;
    	return child_ctx;
    }

    function get_each_context_6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	child_ctx[13] = i;
    	return child_ctx;
    }

    function get_each_context_7(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	child_ctx[13] = i;
    	return child_ctx;
    }

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	child_ctx[13] = i;
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	child_ctx[13] = i;
    	return child_ctx;
    }

    function get_each_context_2$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	child_ctx[13] = i;
    	return child_ctx;
    }

    function get_each_context_3$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	child_ctx[13] = i;
    	return child_ctx;
    }

    // (185:10) {:else}
    function create_else_block_2(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "No device connected.";
    			attr_dev(p, "class", "device svelte-14q15au");
    			add_location(p, file$e, 185, 12, 5036);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(185:10) {:else}",
    		ctx
    	});

    	return block;
    }

    // (175:10) {#if $configuration}
    function create_if_block_20(ctx) {
    	let p;
    	let t0;
    	let strong0;
    	let t1_value = /*$configuration*/ ctx[3].device().name + "";
    	let t1;
    	let t2;
    	let strong1;
    	let t3_value = /*$configuration*/ ctx[3].firmwareVersion + "";
    	let t3;
    	let t4;
    	let show_if = /*upgradeString*/ ctx[1].trim() != "";
    	let if_block = show_if && create_if_block_21(ctx);

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Connected: ");
    			strong0 = element("strong");
    			t1 = text(t1_value);
    			t2 = text(" running firmware ");
    			strong1 = element("strong");
    			t3 = text(t3_value);
    			t4 = space();
    			if (if_block) if_block.c();
    			add_location(strong0, file$e, 176, 25, 4621);
    			add_location(strong1, file$e, 176, 90, 4686);
    			attr_dev(p, "class", "device svelte-14q15au");
    			add_location(p, file$e, 175, 12, 4577);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, strong0);
    			append_dev(strong0, t1);
    			append_dev(p, t2);
    			append_dev(p, strong1);
    			append_dev(strong1, t3);
    			append_dev(p, t4);
    			if (if_block) if_block.m(p, null);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$configuration*/ 8 && t1_value !== (t1_value = /*$configuration*/ ctx[3].device().name + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*$configuration*/ 8 && t3_value !== (t3_value = /*$configuration*/ ctx[3].firmwareVersion + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*upgradeString*/ 2) show_if = /*upgradeString*/ ctx[1].trim() != "";

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_21(ctx);
    					if_block.c();
    					if_block.m(p, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_20.name,
    		type: "if",
    		source: "(175:10) {#if $configuration}",
    		ctx
    	});

    	return block;
    }

    // (178:14) {#if upgradeString.trim() != ""}
    function create_if_block_21(ctx) {
    	let span;
    	let t0;
    	let t1;
    	let a;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text(/*upgradeString*/ ctx[1]);
    			t1 = space();
    			a = element("a");
    			a.textContent = "Download";
    			attr_dev(a, "href", "https://github.com/TomWhitwell/Smith-Kakehashi/releases");
    			add_location(a, file$e, 180, 16, 4868);
    			attr_dev(span, "class", "upgrade svelte-14q15au");
    			add_location(span, file$e, 178, 14, 4797);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, a);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*upgradeString*/ 2) set_data_dev(t0, /*upgradeString*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_21.name,
    		type: "if",
    		source: "(178:14) {#if upgradeString.trim() != \\\"\\\"}",
    		ctx
    	});

    	return block;
    }

    // (172:6) <MidiEnabled>
    function create_default_slot_26(ctx) {
    	let div;

    	function select_block_type(ctx, dirty) {
    		if (/*$configuration*/ ctx[3]) return create_if_block_20;
    		return create_else_block_2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "details svelte-14q15au");
    			add_location(div, file$e, 172, 8, 4476);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_26.name,
    		type: "slot",
    		source: "(172:6) <MidiEnabled>",
    		ctx
    	});

    	return block;
    }

    // (375:6) {:else}
    function create_else_block_1(ctx) {
    	let p0;
    	let t0;
    	let br;
    	let p1;
    	let t2;
    	let p2;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			t0 = text("Searching for a controller via USB, hang on a second or ten. ");
    			br = element("br");
    			p1 = element("p");
    			p1.textContent = "If you haven't plugged in your 8mu, do it now.";
    			t2 = space();
    			p2 = element("p");
    			img = element("img");
    			add_location(br, file$e, 375, 72, 10736);
    			add_location(p0, file$e, 375, 8, 10672);
    			add_location(p1, file$e, 375, 76, 10740);
    			if (img.src !== (img_src_value = "https://www.musicthing.co.uk/images/8mu_editor_crop.png")) attr_dev(img, "src", img_src_value);
    			add_location(img, file$e, 376, 11, 10805);
    			add_location(p2, file$e, 376, 8, 10802);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			append_dev(p0, t0);
    			append_dev(p0, br);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, p2, anchor);
    			append_dev(p2, img);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(p2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(375:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (192:6) {#if $configuration}
    function create_if_block$7(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let t;
    	let p;
    	let current;
    	const if_block_creators = [create_if_block_1$3, create_else_block$3];
    	const if_blocks = [];

    	function select_block_type_2(ctx, dirty) {
    		if (/*$editMode*/ ctx[2]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_2(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			t = space();
    			p = element("p");
    			add_location(p, file$e, 373, 8, 10644);
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, p, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_2(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(t.parentNode, t);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$7.name,
    		type: "if",
    		source: "(192:6) {#if $configuration}",
    		ctx
    	});

    	return block;
    }

    // (254:8) {:else}
    function create_else_block$3(ctx) {
    	let t0;
    	let t1;
    	let p;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let t8;
    	let current;

    	const subhead = new Subhead({
    			props: {
    				title: "Bank " + (/*$configuration*/ ctx[3].pageNumber + 1) + ": Current Configuration",
    				$$slots: { default: [create_default_slot_25] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tabs = new Tabs({
    			props: {
    				$$slots: { default: [create_default_slot_15] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	function select_block_type_3(ctx, dirty) {
    		if (/*$configuration*/ ctx[3].faderBlink) return create_if_block_14;
    		if (!/*$configuration*/ ctx[3].faderBlink) return create_if_block_15;
    	}

    	let current_block_type = select_block_type_3(ctx);
    	let if_block0 = current_block_type && current_block_type(ctx);

    	function select_block_type_4(ctx, dirty) {
    		if (/*$configuration*/ ctx[3].accelBlink) return create_if_block_12;
    		if (!/*$configuration*/ ctx[3].accelBlink) return create_if_block_13;
    	}

    	let current_block_type_1 = select_block_type_4(ctx);
    	let if_block1 = current_block_type_1 && current_block_type_1(ctx);

    	function select_block_type_5(ctx, dirty) {
    		if (/*$configuration*/ ctx[3].controllerFlip) return create_if_block_10;
    		if (!/*$configuration*/ ctx[3].controllerFlip) return create_if_block_11;
    	}

    	let current_block_type_2 = select_block_type_5(ctx);
    	let if_block2 = current_block_type_2 && current_block_type_2(ctx);

    	function select_block_type_6(ctx, dirty) {
    		if (/*$configuration*/ ctx[3].midiThru) return create_if_block_8;
    		if (!/*$configuration*/ ctx[3].midiThru) return create_if_block_9;
    	}

    	let current_block_type_3 = select_block_type_6(ctx);
    	let if_block3 = current_block_type_3 && current_block_type_3(ctx);

    	function select_block_type_7(ctx, dirty) {
    		if (/*$configuration*/ ctx[3].midiMode) return create_if_block_6;
    		if (!/*$configuration*/ ctx[3].midiMode) return create_if_block_7;
    	}

    	let current_block_type_4 = select_block_type_7(ctx);
    	let if_block4 = current_block_type_4 && current_block_type_4(ctx);

    	const block = {
    		c: function create() {
    			create_component(subhead.$$.fragment);
    			t0 = space();
    			create_component(tabs.$$.fragment);
    			t1 = space();
    			p = element("p");
    			t2 = text("Fader blink ");
    			if (if_block0) if_block0.c();
    			t3 = text("\n | \n \n\n \nGesture blink ");
    			if (if_block1) if_block1.c();
    			t4 = text("\n | \n \n\n \nUsb on ");
    			if (if_block2) if_block2.c();
    			t5 = text("\n | \n \n \nMidi thru ");
    			if (if_block3) if_block3.c();
    			t6 = text("\n | \n \n\n \n");
    			if (if_block4) if_block4.c();
    			t7 = text("  |\n \n \n\n \n Tip: ");
    			t8 = text(/*tip*/ ctx[5]);
    			add_location(p, file$e, 314, 0, 9964);
    		},
    		m: function mount(target, anchor) {
    			mount_component(subhead, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(tabs, target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p, anchor);
    			append_dev(p, t2);
    			if (if_block0) if_block0.m(p, null);
    			append_dev(p, t3);
    			if (if_block1) if_block1.m(p, null);
    			append_dev(p, t4);
    			if (if_block2) if_block2.m(p, null);
    			append_dev(p, t5);
    			if (if_block3) if_block3.m(p, null);
    			append_dev(p, t6);
    			if (if_block4) if_block4.m(p, null);
    			append_dev(p, t7);
    			append_dev(p, t8);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const subhead_changes = {};
    			if (dirty & /*$configuration*/ 8) subhead_changes.title = "Bank " + (/*$configuration*/ ctx[3].pageNumber + 1) + ": Current Configuration";

    			if (dirty & /*$$scope*/ 4194304) {
    				subhead_changes.$$scope = { dirty, ctx };
    			}

    			subhead.$set(subhead_changes);
    			const tabs_changes = {};

    			if (dirty & /*$$scope, $configuration*/ 4194312) {
    				tabs_changes.$$scope = { dirty, ctx };
    			}

    			tabs.$set(tabs_changes);

    			if (current_block_type !== (current_block_type = select_block_type_3(ctx))) {
    				if (if_block0) if_block0.d(1);
    				if_block0 = current_block_type && current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(p, t3);
    				}
    			}

    			if (current_block_type_1 !== (current_block_type_1 = select_block_type_4(ctx))) {
    				if (if_block1) if_block1.d(1);
    				if_block1 = current_block_type_1 && current_block_type_1(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(p, t4);
    				}
    			}

    			if (current_block_type_2 !== (current_block_type_2 = select_block_type_5(ctx))) {
    				if (if_block2) if_block2.d(1);
    				if_block2 = current_block_type_2 && current_block_type_2(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(p, t5);
    				}
    			}

    			if (current_block_type_3 !== (current_block_type_3 = select_block_type_6(ctx))) {
    				if (if_block3) if_block3.d(1);
    				if_block3 = current_block_type_3 && current_block_type_3(ctx);

    				if (if_block3) {
    					if_block3.c();
    					if_block3.m(p, t6);
    				}
    			}

    			if (current_block_type_4 !== (current_block_type_4 = select_block_type_7(ctx))) {
    				if (if_block4) if_block4.d(1);
    				if_block4 = current_block_type_4 && current_block_type_4(ctx);

    				if (if_block4) {
    					if_block4.c();
    					if_block4.m(p, t7);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(subhead.$$.fragment, local);
    			transition_in(tabs.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(subhead.$$.fragment, local);
    			transition_out(tabs.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(subhead, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(tabs, detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p);

    			if (if_block0) {
    				if_block0.d();
    			}

    			if (if_block1) {
    				if_block1.d();
    			}

    			if (if_block2) {
    				if_block2.d();
    			}

    			if (if_block3) {
    				if_block3.d();
    			}

    			if (if_block4) {
    				if_block4.d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$3.name,
    		type: "else",
    		source: "(254:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (193:8) {#if $editMode}
    function create_if_block_1$3(ctx) {
    	let t;
    	let current;

    	const subhead = new Subhead({
    			props: {
    				title: "Bank " + (/*$configuration*/ ctx[3].pageNumber + 1) + ": Edit configuration",
    				$$slots: { default: [create_default_slot_14] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tabs = new Tabs({
    			props: {
    				$$slots: { default: [create_default_slot_2$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(subhead.$$.fragment);
    			t = space();
    			create_component(tabs.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(subhead, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(tabs, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const subhead_changes = {};
    			if (dirty & /*$configuration*/ 8) subhead_changes.title = "Bank " + (/*$configuration*/ ctx[3].pageNumber + 1) + ": Edit configuration";

    			if (dirty & /*$$scope, configDirty*/ 4194305) {
    				subhead_changes.$$scope = { dirty, ctx };
    			}

    			subhead.$set(subhead_changes);
    			const tabs_changes = {};

    			if (dirty & /*$$scope, $editConfiguration, $configuration*/ 4194328) {
    				tabs_changes.$$scope = { dirty, ctx };
    			}

    			tabs.$set(tabs_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(subhead.$$.fragment, local);
    			transition_in(tabs.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(subhead.$$.fragment, local);
    			transition_out(tabs.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(subhead, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(tabs, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(193:8) {#if $editMode}",
    		ctx
    	});

    	return block;
    }

    // (255:10) <Subhead title="Bank {$configuration.pageNumber + 1}: Current Configuration">
    function create_default_slot_25(ctx) {
    	let t0;
    	let t1;
    	let current;

    	const button0 = new Button({
    			props: {
    				label: "Export current config",
    				icon: "file-export",
    				clickMessageName: "exportConfig"
    			},
    			$$inline: true
    		});

    	button0.$on("message", /*handleMessage*/ ctx[6]);

    	const button1 = new Button({
    			props: {
    				label: "Edit config",
    				icon: "pencil-alt",
    				clickMessageName: "toggleEditMode"
    			},
    			$$inline: true
    		});

    	button1.$on("message", /*handleMessage*/ ctx[6]);

    	const button2 = new Button({
    			props: {
    				label: "Reload config from controller",
    				icon: "sync",
    				clickMessageName: "requestConfig"
    			},
    			$$inline: true
    		});

    	button2.$on("message", /*handleMessage*/ ctx[6]);

    	const block = {
    		c: function create() {
    			create_component(button0.$$.fragment);
    			t0 = space();
    			create_component(button1.$$.fragment);
    			t1 = space();
    			create_component(button2.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(button0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(button1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(button2, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			transition_in(button2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			transition_out(button2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(button0, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(button1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(button2, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_25.name,
    		type: "slot",
    		source: "(255:10) <Subhead title=\\\"Bank {$configuration.pageNumber + 1}: Current Configuration\\\">",
    		ctx
    	});

    	return block;
    }

    // (262:14) <Tab>
    function create_default_slot_24(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("USB");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_24.name,
    		type: "slot",
    		source: "(262:14) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (263:14) <Tab>
    function create_default_slot_23(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("TRS Midi");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_23.name,
    		type: "slot",
    		source: "(263:14) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (264:16) <Tab>
    function create_default_slot_22(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("USB Buttons");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_22.name,
    		type: "slot",
    		source: "(264:16) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (265:16) <Tab>
    function create_default_slot_21(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("TRS Buttons");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_21.name,
    		type: "slot",
    		source: "(265:16) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (261:12) <TabList>
    function create_default_slot_20(ctx) {
    	let t0;
    	let t1;
    	let t2;
    	let current;

    	const tab0 = new Tab({
    			props: {
    				$$slots: { default: [create_default_slot_24] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tab1 = new Tab({
    			props: {
    				$$slots: { default: [create_default_slot_23] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tab2 = new Tab({
    			props: {
    				$$slots: { default: [create_default_slot_22] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tab3 = new Tab({
    			props: {
    				$$slots: { default: [create_default_slot_21] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(tab0.$$.fragment);
    			t0 = space();
    			create_component(tab1.$$.fragment);
    			t1 = space();
    			create_component(tab2.$$.fragment);
    			t2 = space();
    			create_component(tab3.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tab0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(tab1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(tab2, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(tab3, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const tab0_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				tab0_changes.$$scope = { dirty, ctx };
    			}

    			tab0.$set(tab0_changes);
    			const tab1_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				tab1_changes.$$scope = { dirty, ctx };
    			}

    			tab1.$set(tab1_changes);
    			const tab2_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				tab2_changes.$$scope = { dirty, ctx };
    			}

    			tab2.$set(tab2_changes);
    			const tab3_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				tab3_changes.$$scope = { dirty, ctx };
    			}

    			tab3.$set(tab3_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tab0.$$.fragment, local);
    			transition_in(tab1.$$.fragment, local);
    			transition_in(tab2.$$.fragment, local);
    			transition_in(tab3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tab0.$$.fragment, local);
    			transition_out(tab1.$$.fragment, local);
    			transition_out(tab2.$$.fragment, local);
    			transition_out(tab3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tab0, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(tab1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(tab2, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(tab3, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_20.name,
    		type: "slot",
    		source: "(261:12) <TabList>",
    		ctx
    	});

    	return block;
    }

    // (271:18) {#if index < $configuration.device().controlCount}
    function create_if_block_19(ctx) {
    	let current;

    	const control = new Control({
    			props: {
    				control: /*control*/ ctx[17],
    				index: /*index*/ ctx[13]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(control.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(control, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const control_changes = {};
    			if (dirty & /*$configuration*/ 8) control_changes.control = /*control*/ ctx[17];
    			control.$set(control_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(control.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(control.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(control, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_19.name,
    		type: "if",
    		source: "(271:18) {#if index < $configuration.device().controlCount}",
    		ctx
    	});

    	return block;
    }

    // (270:16) {#each $configuration.usbControls as control, index}
    function create_each_block_7(ctx) {
    	let show_if = /*index*/ ctx[13] < /*$configuration*/ ctx[3].device().controlCount;
    	let if_block_anchor;
    	let current;
    	let if_block = show_if && create_if_block_19(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$configuration*/ 8) show_if = /*index*/ ctx[13] < /*$configuration*/ ctx[3].device().controlCount;

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_19(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_7.name,
    		type: "each",
    		source: "(270:16) {#each $configuration.usbControls as control, index}",
    		ctx
    	});

    	return block;
    }

    // (268:12) <TabPanel>
    function create_default_slot_19(ctx) {
    	let div;
    	let current;
    	let each_value_7 = /*$configuration*/ ctx[3].usbControls;
    	let each_blocks = [];

    	for (let i = 0; i < each_value_7.length; i += 1) {
    		each_blocks[i] = create_each_block_7(get_each_context_7(ctx, each_value_7, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "id", "controls");
    			attr_dev(div, "class", "svelte-14q15au");
    			add_location(div, file$e, 268, 14, 8438);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$configuration*/ 8) {
    				each_value_7 = /*$configuration*/ ctx[3].usbControls;
    				let i;

    				for (i = 0; i < each_value_7.length; i += 1) {
    					const child_ctx = get_each_context_7(ctx, each_value_7, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_7(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_7.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_7.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_19.name,
    		type: "slot",
    		source: "(268:12) <TabPanel>",
    		ctx
    	});

    	return block;
    }

    // (281:18) {#if index < $configuration.device().controlCount}
    function create_if_block_18(ctx) {
    	let current;

    	const control = new Control({
    			props: {
    				control: /*control*/ ctx[17],
    				index: /*index*/ ctx[13],
    				disableValue: true
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(control.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(control, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const control_changes = {};
    			if (dirty & /*$configuration*/ 8) control_changes.control = /*control*/ ctx[17];
    			control.$set(control_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(control.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(control.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(control, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_18.name,
    		type: "if",
    		source: "(281:18) {#if index < $configuration.device().controlCount}",
    		ctx
    	});

    	return block;
    }

    // (280:16) {#each $configuration.trsControls as control, index}
    function create_each_block_6(ctx) {
    	let show_if = /*index*/ ctx[13] < /*$configuration*/ ctx[3].device().controlCount;
    	let if_block_anchor;
    	let current;
    	let if_block = show_if && create_if_block_18(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$configuration*/ 8) show_if = /*index*/ ctx[13] < /*$configuration*/ ctx[3].device().controlCount;

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_18(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_6.name,
    		type: "each",
    		source: "(280:16) {#each $configuration.trsControls as control, index}",
    		ctx
    	});

    	return block;
    }

    // (278:12) <TabPanel>
    function create_default_slot_18(ctx) {
    	let div;
    	let t0;
    	let p;
    	let current;
    	let each_value_6 = /*$configuration*/ ctx[3].trsControls;
    	let each_blocks = [];

    	for (let i = 0; i < each_value_6.length; i += 1) {
    		each_blocks[i] = create_each_block_6(get_each_context_6(ctx, each_value_6, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			p = element("p");
    			p.textContent = "There is no realtime preview of the TRS outputs.";
    			attr_dev(div, "id", "controls");
    			attr_dev(div, "class", "svelte-14q15au");
    			add_location(div, file$e, 278, 14, 8777);
    			add_location(p, file$e, 285, 14, 9088);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			insert_dev(target, t0, anchor);
    			insert_dev(target, p, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$configuration*/ 8) {
    				each_value_6 = /*$configuration*/ ctx[3].trsControls;
    				let i;

    				for (i = 0; i < each_value_6.length; i += 1) {
    					const child_ctx = get_each_context_6(ctx, each_value_6, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_6(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_6.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_6.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_18.name,
    		type: "slot",
    		source: "(278:12) <TabPanel>",
    		ctx
    	});

    	return block;
    }

    // (293:18) {#if index < $configuration.device().buttonCount}
    function create_if_block_17(ctx) {
    	let current;

    	const controlbutton = new ControlButton({
    			props: {
    				control: /*control*/ ctx[17],
    				index: /*index*/ ctx[13]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(controlbutton.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(controlbutton, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const controlbutton_changes = {};
    			if (dirty & /*$configuration*/ 8) controlbutton_changes.control = /*control*/ ctx[17];
    			controlbutton.$set(controlbutton_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(controlbutton.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(controlbutton.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(controlbutton, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_17.name,
    		type: "if",
    		source: "(293:18) {#if index < $configuration.device().buttonCount}",
    		ctx
    	});

    	return block;
    }

    // (292:16) {#each $configuration.usbButtons as control, index}
    function create_each_block_5$1(ctx) {
    	let show_if = /*index*/ ctx[13] < /*$configuration*/ ctx[3].device().buttonCount;
    	let if_block_anchor;
    	let current;
    	let if_block = show_if && create_if_block_17(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$configuration*/ 8) show_if = /*index*/ ctx[13] < /*$configuration*/ ctx[3].device().buttonCount;

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_17(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_5$1.name,
    		type: "each",
    		source: "(292:16) {#each $configuration.usbButtons as control, index}",
    		ctx
    	});

    	return block;
    }

    // (290:22) <TabPanel>
    function create_default_slot_17(ctx) {
    	let div;
    	let current;
    	let each_value_5 = /*$configuration*/ ctx[3].usbButtons;
    	let each_blocks = [];

    	for (let i = 0; i < each_value_5.length; i += 1) {
    		each_blocks[i] = create_each_block_5$1(get_each_context_5$1(ctx, each_value_5, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "id", "controls");
    			attr_dev(div, "class", "svelte-14q15au");
    			add_location(div, file$e, 290, 15, 9242);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$configuration*/ 8) {
    				each_value_5 = /*$configuration*/ ctx[3].usbButtons;
    				let i;

    				for (i = 0; i < each_value_5.length; i += 1) {
    					const child_ctx = get_each_context_5$1(ctx, each_value_5, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_5$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_5.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_5.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_17.name,
    		type: "slot",
    		source: "(290:22) <TabPanel>",
    		ctx
    	});

    	return block;
    }

    // (303:18) {#if index < $configuration.device().buttonCount}
    function create_if_block_16(ctx) {
    	let current;

    	const controlbutton = new ControlButton({
    			props: {
    				control: /*control*/ ctx[17],
    				index: /*index*/ ctx[13]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(controlbutton.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(controlbutton, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const controlbutton_changes = {};
    			if (dirty & /*$configuration*/ 8) controlbutton_changes.control = /*control*/ ctx[17];
    			controlbutton.$set(controlbutton_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(controlbutton.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(controlbutton.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(controlbutton, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_16.name,
    		type: "if",
    		source: "(303:18) {#if index < $configuration.device().buttonCount}",
    		ctx
    	});

    	return block;
    }

    // (302:16) {#each $configuration.trsButtons as control, index}
    function create_each_block_4$1(ctx) {
    	let show_if = /*index*/ ctx[13] < /*$configuration*/ ctx[3].device().buttonCount;
    	let if_block_anchor;
    	let current;
    	let if_block = show_if && create_if_block_16(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$configuration*/ 8) show_if = /*index*/ ctx[13] < /*$configuration*/ ctx[3].device().buttonCount;

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_16(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4$1.name,
    		type: "each",
    		source: "(302:16) {#each $configuration.trsButtons as control, index}",
    		ctx
    	});

    	return block;
    }

    // (300:12) <TabPanel>
    function create_default_slot_16(ctx) {
    	let div;
    	let current;
    	let each_value_4 = /*$configuration*/ ctx[3].trsButtons;
    	let each_blocks = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks[i] = create_each_block_4$1(get_each_context_4$1(ctx, each_value_4, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "id", "controls");
    			attr_dev(div, "class", "svelte-14q15au");
    			add_location(div, file$e, 300, 15, 9598);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$configuration*/ 8) {
    				each_value_4 = /*$configuration*/ ctx[3].trsButtons;
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4$1(ctx, each_value_4, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_4$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_4.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_4.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_16.name,
    		type: "slot",
    		source: "(300:12) <TabPanel>",
    		ctx
    	});

    	return block;
    }

    // (260:10) <Tabs>
    function create_default_slot_15(ctx) {
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let current;

    	const tablist = new TabList({
    			props: {
    				$$slots: { default: [create_default_slot_20] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tabpanel0 = new TabPanel({
    			props: {
    				$$slots: { default: [create_default_slot_19] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tabpanel1 = new TabPanel({
    			props: {
    				$$slots: { default: [create_default_slot_18] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tabpanel2 = new TabPanel({
    			props: {
    				$$slots: { default: [create_default_slot_17] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tabpanel3 = new TabPanel({
    			props: {
    				$$slots: { default: [create_default_slot_16] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(tablist.$$.fragment);
    			t0 = space();
    			create_component(tabpanel0.$$.fragment);
    			t1 = space();
    			create_component(tabpanel1.$$.fragment);
    			t2 = space();
    			create_component(tabpanel2.$$.fragment);
    			t3 = space();
    			create_component(tabpanel3.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tablist, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(tabpanel0, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(tabpanel1, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(tabpanel2, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(tabpanel3, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const tablist_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				tablist_changes.$$scope = { dirty, ctx };
    			}

    			tablist.$set(tablist_changes);
    			const tabpanel0_changes = {};

    			if (dirty & /*$$scope, $configuration*/ 4194312) {
    				tabpanel0_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel0.$set(tabpanel0_changes);
    			const tabpanel1_changes = {};

    			if (dirty & /*$$scope, $configuration*/ 4194312) {
    				tabpanel1_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel1.$set(tabpanel1_changes);
    			const tabpanel2_changes = {};

    			if (dirty & /*$$scope, $configuration*/ 4194312) {
    				tabpanel2_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel2.$set(tabpanel2_changes);
    			const tabpanel3_changes = {};

    			if (dirty & /*$$scope, $configuration*/ 4194312) {
    				tabpanel3_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel3.$set(tabpanel3_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tablist.$$.fragment, local);
    			transition_in(tabpanel0.$$.fragment, local);
    			transition_in(tabpanel1.$$.fragment, local);
    			transition_in(tabpanel2.$$.fragment, local);
    			transition_in(tabpanel3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tablist.$$.fragment, local);
    			transition_out(tabpanel0.$$.fragment, local);
    			transition_out(tabpanel1.$$.fragment, local);
    			transition_out(tabpanel2.$$.fragment, local);
    			transition_out(tabpanel3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tablist, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(tabpanel0, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(tabpanel1, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(tabpanel2, detaching);
    			if (detaching) detach_dev(t3);
    			destroy_component(tabpanel3, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_15.name,
    		type: "slot",
    		source: "(260:10) <Tabs>",
    		ctx
    	});

    	return block;
    }

    // (318:37) 
    function create_if_block_15(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("off");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_15.name,
    		type: "if",
    		source: "(318:37) ",
    		ctx
    	});

    	return block;
    }

    // (316:12) {#if $configuration.faderBlink}
    function create_if_block_14(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("on");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_14.name,
    		type: "if",
    		source: "(316:12) {#if $configuration.faderBlink}",
    		ctx
    	});

    	return block;
    }

    // (327:37) 
    function create_if_block_13(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("off");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_13.name,
    		type: "if",
    		source: "(327:37) ",
    		ctx
    	});

    	return block;
    }

    // (325:14) {#if $configuration.accelBlink}
    function create_if_block_12(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("on");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_12.name,
    		type: "if",
    		source: "(325:14) {#if $configuration.accelBlink}",
    		ctx
    	});

    	return block;
    }

    // (336:41) 
    function create_if_block_11(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("right");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_11.name,
    		type: "if",
    		source: "(336:41) ",
    		ctx
    	});

    	return block;
    }

    // (334:7) {#if $configuration.controllerFlip}
    function create_if_block_10(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("left");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(334:7) {#if $configuration.controllerFlip}",
    		ctx
    	});

    	return block;
    }

    // (344:35) 
    function create_if_block_9(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("off");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(344:35) ",
    		ctx
    	});

    	return block;
    }

    // (342:10) {#if $configuration.midiThru}
    function create_if_block_8(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("on");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(342:10) {#if $configuration.midiThru}",
    		ctx
    	});

    	return block;
    }

    // (353:35) 
    function create_if_block_7(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Midi Type A");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(353:35) ",
    		ctx
    	});

    	return block;
    }

    // (351:0) {#if $configuration.midiMode}
    function create_if_block_6(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Midi Type B");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(351:0) {#if $configuration.midiMode}",
    		ctx
    	});

    	return block;
    }

    // (194:10) <Subhead title="Bank {$configuration.pageNumber + 1}: Edit configuration">
    function create_default_slot_14(ctx) {
    	let t0;
    	let t1;
    	let current;

    	const button0 = new Button({
    			props: {
    				label: "Cancel",
    				icon: "times",
    				clickMessageName: "toggleEditMode"
    			},
    			$$inline: true
    		});

    	button0.$on("message", /*handleMessage*/ ctx[6]);

    	const button1 = new Button({
    			props: {
    				label: "Import config",
    				icon: "file-import",
    				clickMessageName: "importConfig"
    			},
    			$$inline: true
    		});

    	button1.$on("message", /*handleMessage*/ ctx[6]);

    	const button2 = new Button({
    			props: {
    				label: "Update controller",
    				icon: "download",
    				clickMessageName: "transmitConfig",
    				disabled: !/*configDirty*/ ctx[0]
    			},
    			$$inline: true
    		});

    	button2.$on("message", /*handleMessage*/ ctx[6]);

    	const block = {
    		c: function create() {
    			create_component(button0.$$.fragment);
    			t0 = space();
    			create_component(button1.$$.fragment);
    			t1 = space();
    			create_component(button2.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(button0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(button1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(button2, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const button2_changes = {};
    			if (dirty & /*configDirty*/ 1) button2_changes.disabled = !/*configDirty*/ ctx[0];
    			button2.$set(button2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			transition_in(button2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			transition_out(button2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(button0, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(button1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(button2, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_14.name,
    		type: "slot",
    		source: "(194:10) <Subhead title=\\\"Bank {$configuration.pageNumber + 1}: Edit configuration\\\">",
    		ctx
    	});

    	return block;
    }

    // (201:14) <Tab>
    function create_default_slot_13(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("USB");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_13.name,
    		type: "slot",
    		source: "(201:14) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (202:14) <Tab>
    function create_default_slot_12(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("TRS Midi");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_12.name,
    		type: "slot",
    		source: "(202:14) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (203:14) <Tab>
    function create_default_slot_11(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("USB Buttons");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_11.name,
    		type: "slot",
    		source: "(203:14) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (204:14) <Tab>
    function create_default_slot_10(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("TRS Buttons");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_10.name,
    		type: "slot",
    		source: "(204:14) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (205:14) <Tab>
    function create_default_slot_9(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Device Options");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_9.name,
    		type: "slot",
    		source: "(205:14) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (200:12) <TabList>
    function create_default_slot_8(ctx) {
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let current;

    	const tab0 = new Tab({
    			props: {
    				$$slots: { default: [create_default_slot_13] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tab1 = new Tab({
    			props: {
    				$$slots: { default: [create_default_slot_12] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tab2 = new Tab({
    			props: {
    				$$slots: { default: [create_default_slot_11] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tab3 = new Tab({
    			props: {
    				$$slots: { default: [create_default_slot_10] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tab4 = new Tab({
    			props: {
    				$$slots: { default: [create_default_slot_9] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(tab0.$$.fragment);
    			t0 = space();
    			create_component(tab1.$$.fragment);
    			t1 = space();
    			create_component(tab2.$$.fragment);
    			t2 = space();
    			create_component(tab3.$$.fragment);
    			t3 = space();
    			create_component(tab4.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tab0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(tab1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(tab2, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(tab3, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(tab4, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const tab0_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				tab0_changes.$$scope = { dirty, ctx };
    			}

    			tab0.$set(tab0_changes);
    			const tab1_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				tab1_changes.$$scope = { dirty, ctx };
    			}

    			tab1.$set(tab1_changes);
    			const tab2_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				tab2_changes.$$scope = { dirty, ctx };
    			}

    			tab2.$set(tab2_changes);
    			const tab3_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				tab3_changes.$$scope = { dirty, ctx };
    			}

    			tab3.$set(tab3_changes);
    			const tab4_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				tab4_changes.$$scope = { dirty, ctx };
    			}

    			tab4.$set(tab4_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tab0.$$.fragment, local);
    			transition_in(tab1.$$.fragment, local);
    			transition_in(tab2.$$.fragment, local);
    			transition_in(tab3.$$.fragment, local);
    			transition_in(tab4.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tab0.$$.fragment, local);
    			transition_out(tab1.$$.fragment, local);
    			transition_out(tab2.$$.fragment, local);
    			transition_out(tab3.$$.fragment, local);
    			transition_out(tab4.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tab0, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(tab1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(tab2, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(tab3, detaching);
    			if (detaching) detach_dev(t3);
    			destroy_component(tab4, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_8.name,
    		type: "slot",
    		source: "(200:12) <TabList>",
    		ctx
    	});

    	return block;
    }

    // (211:18) {#if index < $configuration.device().controlCount}
    function create_if_block_5(ctx) {
    	let current;

    	const editcontrol = new EditControl({
    			props: {
    				editControl: /*editControl*/ ctx[11],
    				index: /*index*/ ctx[13]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(editcontrol.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(editcontrol, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const editcontrol_changes = {};
    			if (dirty & /*$editConfiguration*/ 16) editcontrol_changes.editControl = /*editControl*/ ctx[11];
    			editcontrol.$set(editcontrol_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(editcontrol.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(editcontrol.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(editcontrol, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(211:18) {#if index < $configuration.device().controlCount}",
    		ctx
    	});

    	return block;
    }

    // (210:16) {#each $editConfiguration.usbControls as editControl, index}
    function create_each_block_3$1(ctx) {
    	let show_if = /*index*/ ctx[13] < /*$configuration*/ ctx[3].device().controlCount;
    	let if_block_anchor;
    	let current;
    	let if_block = show_if && create_if_block_5(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$configuration*/ 8) show_if = /*index*/ ctx[13] < /*$configuration*/ ctx[3].device().controlCount;

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_5(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3$1.name,
    		type: "each",
    		source: "(210:16) {#each $editConfiguration.usbControls as editControl, index}",
    		ctx
    	});

    	return block;
    }

    // (208:9) <TabPanel>
    function create_default_slot_7(ctx) {
    	let div;
    	let current;
    	let each_value_3 = /*$editConfiguration*/ ctx[4].usbControls;
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3$1(get_each_context_3$1(ctx, each_value_3, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "id", "controls");
    			attr_dev(div, "class", "svelte-14q15au");
    			add_location(div, file$e, 208, 14, 6136);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$editConfiguration, $configuration*/ 24) {
    				each_value_3 = /*$editConfiguration*/ ctx[4].usbControls;
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3$1(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_3$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_3.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_3.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_7.name,
    		type: "slot",
    		source: "(208:9) <TabPanel>",
    		ctx
    	});

    	return block;
    }

    // (221:18) {#if index < $configuration.device().controlCount}
    function create_if_block_4$1(ctx) {
    	let current;

    	const editcontrol = new EditControl({
    			props: {
    				editControl: /*editControl*/ ctx[11],
    				index: /*index*/ ctx[13]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(editcontrol.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(editcontrol, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const editcontrol_changes = {};
    			if (dirty & /*$editConfiguration*/ 16) editcontrol_changes.editControl = /*editControl*/ ctx[11];
    			editcontrol.$set(editcontrol_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(editcontrol.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(editcontrol.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(editcontrol, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$1.name,
    		type: "if",
    		source: "(221:18) {#if index < $configuration.device().controlCount}",
    		ctx
    	});

    	return block;
    }

    // (220:16) {#each $editConfiguration.trsControls as editControl, index}
    function create_each_block_2$1(ctx) {
    	let show_if = /*index*/ ctx[13] < /*$configuration*/ ctx[3].device().controlCount;
    	let if_block_anchor;
    	let current;
    	let if_block = show_if && create_if_block_4$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$configuration*/ 8) show_if = /*index*/ ctx[13] < /*$configuration*/ ctx[3].device().controlCount;

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_4$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2$1.name,
    		type: "each",
    		source: "(220:16) {#each $editConfiguration.trsControls as editControl, index}",
    		ctx
    	});

    	return block;
    }

    // (218:12) <TabPanel>
    function create_default_slot_6(ctx) {
    	let div;
    	let current;
    	let each_value_2 = /*$editConfiguration*/ ctx[4].trsControls;
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2$1(get_each_context_2$1(ctx, each_value_2, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "id", "controls");
    			attr_dev(div, "class", "svelte-14q15au");
    			add_location(div, file$e, 218, 14, 6501);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$editConfiguration, $configuration*/ 24) {
    				each_value_2 = /*$editConfiguration*/ ctx[4].trsControls;
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2$1(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_2$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_6.name,
    		type: "slot",
    		source: "(218:12) <TabPanel>",
    		ctx
    	});

    	return block;
    }

    // (231:18) {#if index < $configuration.device().buttonCount}
    function create_if_block_3$1(ctx) {
    	let current;

    	const editcontrolbutton = new EditControlButton({
    			props: {
    				editControl: /*editControl*/ ctx[11],
    				index: /*index*/ ctx[13]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(editcontrolbutton.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(editcontrolbutton, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const editcontrolbutton_changes = {};
    			if (dirty & /*$editConfiguration*/ 16) editcontrolbutton_changes.editControl = /*editControl*/ ctx[11];
    			editcontrolbutton.$set(editcontrolbutton_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(editcontrolbutton.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(editcontrolbutton.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(editcontrolbutton, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(231:18) {#if index < $configuration.device().buttonCount}",
    		ctx
    	});

    	return block;
    }

    // (230:16) {#each $editConfiguration.usbButtons as editControl, index}
    function create_each_block_1$1(ctx) {
    	let show_if = /*index*/ ctx[13] < /*$configuration*/ ctx[3].device().buttonCount;
    	let if_block_anchor;
    	let current;
    	let if_block = show_if && create_if_block_3$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$configuration*/ 8) show_if = /*index*/ ctx[13] < /*$configuration*/ ctx[3].device().buttonCount;

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_3$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(230:16) {#each $editConfiguration.usbButtons as editControl, index}",
    		ctx
    	});

    	return block;
    }

    // (228:12) <TabPanel>
    function create_default_slot_5(ctx) {
    	let div;
    	let current;
    	let each_value_1 = /*$editConfiguration*/ ctx[4].usbButtons;
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "id", "controls");
    			attr_dev(div, "class", "svelte-14q15au");
    			add_location(div, file$e, 228, 15, 6857);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$editConfiguration, $configuration*/ 24) {
    				each_value_1 = /*$editConfiguration*/ ctx[4].usbButtons;
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_5.name,
    		type: "slot",
    		source: "(228:12) <TabPanel>",
    		ctx
    	});

    	return block;
    }

    // (242:18) {#if index < $configuration.device().buttonCount}
    function create_if_block_2$1(ctx) {
    	let current;

    	const editcontrolbutton = new EditControlButton({
    			props: {
    				editControl: /*editControl*/ ctx[11],
    				index: /*index*/ ctx[13]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(editcontrolbutton.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(editcontrolbutton, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const editcontrolbutton_changes = {};
    			if (dirty & /*$editConfiguration*/ 16) editcontrolbutton_changes.editControl = /*editControl*/ ctx[11];
    			editcontrolbutton.$set(editcontrolbutton_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(editcontrolbutton.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(editcontrolbutton.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(editcontrolbutton, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(242:18) {#if index < $configuration.device().buttonCount}",
    		ctx
    	});

    	return block;
    }

    // (241:16) {#each $editConfiguration.trsButtons as editControl, index}
    function create_each_block$2(ctx) {
    	let show_if = /*index*/ ctx[13] < /*$configuration*/ ctx[3].device().buttonCount;
    	let if_block_anchor;
    	let current;
    	let if_block = show_if && create_if_block_2$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$configuration*/ 8) show_if = /*index*/ ctx[13] < /*$configuration*/ ctx[3].device().buttonCount;

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_2$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(241:16) {#each $editConfiguration.trsButtons as editControl, index}",
    		ctx
    	});

    	return block;
    }

    // (239:12) <TabPanel>
    function create_default_slot_4$1(ctx) {
    	let div;
    	let current;
    	let each_value = /*$editConfiguration*/ ctx[4].trsButtons;
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "id", "controls");
    			attr_dev(div, "class", "svelte-14q15au");
    			add_location(div, file$e, 239, 15, 7250);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$editConfiguration, $configuration*/ 24) {
    				each_value = /*$editConfiguration*/ ctx[4].trsButtons;
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4$1.name,
    		type: "slot",
    		source: "(239:12) <TabPanel>",
    		ctx
    	});

    	return block;
    }

    // (249:12) <TabPanel>
    function create_default_slot_3$1(ctx) {
    	let current;
    	const deviceoptions = new DeviceOptions({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(deviceoptions.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(deviceoptions, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(deviceoptions.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(deviceoptions.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(deviceoptions, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3$1.name,
    		type: "slot",
    		source: "(249:12) <TabPanel>",
    		ctx
    	});

    	return block;
    }

    // (199:10) <Tabs>
    function create_default_slot_2$1(ctx) {
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let current;

    	const tablist = new TabList({
    			props: {
    				$$slots: { default: [create_default_slot_8] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tabpanel0 = new TabPanel({
    			props: {
    				$$slots: { default: [create_default_slot_7] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tabpanel1 = new TabPanel({
    			props: {
    				$$slots: { default: [create_default_slot_6] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tabpanel2 = new TabPanel({
    			props: {
    				$$slots: { default: [create_default_slot_5] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tabpanel3 = new TabPanel({
    			props: {
    				$$slots: { default: [create_default_slot_4$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tabpanel4 = new TabPanel({
    			props: {
    				$$slots: { default: [create_default_slot_3$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(tablist.$$.fragment);
    			t0 = space();
    			create_component(tabpanel0.$$.fragment);
    			t1 = space();
    			create_component(tabpanel1.$$.fragment);
    			t2 = space();
    			create_component(tabpanel2.$$.fragment);
    			t3 = space();
    			create_component(tabpanel3.$$.fragment);
    			t4 = space();
    			create_component(tabpanel4.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tablist, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(tabpanel0, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(tabpanel1, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(tabpanel2, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(tabpanel3, target, anchor);
    			insert_dev(target, t4, anchor);
    			mount_component(tabpanel4, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const tablist_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				tablist_changes.$$scope = { dirty, ctx };
    			}

    			tablist.$set(tablist_changes);
    			const tabpanel0_changes = {};

    			if (dirty & /*$$scope, $editConfiguration, $configuration*/ 4194328) {
    				tabpanel0_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel0.$set(tabpanel0_changes);
    			const tabpanel1_changes = {};

    			if (dirty & /*$$scope, $editConfiguration, $configuration*/ 4194328) {
    				tabpanel1_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel1.$set(tabpanel1_changes);
    			const tabpanel2_changes = {};

    			if (dirty & /*$$scope, $editConfiguration, $configuration*/ 4194328) {
    				tabpanel2_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel2.$set(tabpanel2_changes);
    			const tabpanel3_changes = {};

    			if (dirty & /*$$scope, $editConfiguration, $configuration*/ 4194328) {
    				tabpanel3_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel3.$set(tabpanel3_changes);
    			const tabpanel4_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				tabpanel4_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel4.$set(tabpanel4_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tablist.$$.fragment, local);
    			transition_in(tabpanel0.$$.fragment, local);
    			transition_in(tabpanel1.$$.fragment, local);
    			transition_in(tabpanel2.$$.fragment, local);
    			transition_in(tabpanel3.$$.fragment, local);
    			transition_in(tabpanel4.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tablist.$$.fragment, local);
    			transition_out(tabpanel0.$$.fragment, local);
    			transition_out(tabpanel1.$$.fragment, local);
    			transition_out(tabpanel2.$$.fragment, local);
    			transition_out(tabpanel3.$$.fragment, local);
    			transition_out(tabpanel4.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tablist, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(tabpanel0, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(tabpanel1, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(tabpanel2, detaching);
    			if (detaching) detach_dev(t3);
    			destroy_component(tabpanel3, detaching);
    			if (detaching) detach_dev(t4);
    			destroy_component(tabpanel4, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2$1.name,
    		type: "slot",
    		source: "(199:10) <Tabs>",
    		ctx
    	});

    	return block;
    }

    // (191:4) <MidiEnabled fallback="WebMIDI could not be enabled. Please use a web browser that supports WebMIDI, such as Google Chrome, and allow the browser to use MIDI Devices.">
    function create_default_slot_1$1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$7, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*$configuration*/ ctx[3]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_1(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(191:4) <MidiEnabled fallback=\\\"WebMIDI could not be enabled. Please use a web browser that supports WebMIDI, such as Google Chrome, and allow the browser to use MIDI Devices.\\\">",
    		ctx
    	});

    	return block;
    }

    // (168:0) <MidiContext>
    function create_default_slot$1(ctx) {
    	let main;
    	let div0;
    	let h1;
    	let t1;
    	let t2;
    	let t3;
    	let div1;
    	let current;

    	const midienabled0 = new MidiEnabled({
    			props: {
    				$$slots: { default: [create_default_slot_26] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const midienabled1 = new MidiEnabled({
    			props: {
    				fallback: "WebMIDI could not be enabled. Please use a web browser that supports WebMIDI, such as Google Chrome, and allow the browser to use MIDI Devices.",
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "8mu Controller Editor";
    			t1 = space();
    			create_component(midienabled0.$$.fragment);
    			t2 = space();
    			create_component(midienabled1.$$.fragment);
    			t3 = space();
    			div1 = element("div");
    			div1.textContent = `8mu Editor v${"1.0.1"}`;
    			attr_dev(h1, "class", "svelte-14q15au");
    			add_location(h1, file$e, 170, 6, 4417);
    			attr_dev(div0, "id", "head");
    			attr_dev(div0, "class", "svelte-14q15au");
    			add_location(div0, file$e, 169, 4, 4395);
    			attr_dev(div1, "id", "foot");
    			attr_dev(div1, "class", "svelte-14q15au");
    			add_location(div1, file$e, 379, 4, 10912);
    			attr_dev(main, "class", "svelte-14q15au");
    			add_location(main, file$e, 168, 2, 4384);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div0);
    			append_dev(div0, h1);
    			append_dev(div0, t1);
    			mount_component(midienabled0, div0, null);
    			append_dev(main, t2);
    			mount_component(midienabled1, main, null);
    			append_dev(main, t3);
    			append_dev(main, div1);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const midienabled0_changes = {};

    			if (dirty & /*$$scope, upgradeString, $configuration*/ 4194314) {
    				midienabled0_changes.$$scope = { dirty, ctx };
    			}

    			midienabled0.$set(midienabled0_changes);
    			const midienabled1_changes = {};

    			if (dirty & /*$$scope, $editConfiguration, $configuration, configDirty, $editMode*/ 4194333) {
    				midienabled1_changes.$$scope = { dirty, ctx };
    			}

    			midienabled1.$set(midienabled1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(midienabled0.$$.fragment, local);
    			transition_in(midienabled1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(midienabled0.$$.fragment, local);
    			transition_out(midienabled1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(midienabled0);
    			destroy_component(midienabled1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(168:0) <MidiContext>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$f(ctx) {
    	let current;

    	const midicontext = new MidiContext({
    			props: {
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(midicontext.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(midicontext, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const midicontext_changes = {};

    			if (dirty & /*$$scope, $editConfiguration, $configuration, configDirty, $editMode, upgradeString*/ 4194335) {
    				midicontext_changes.$$scope = { dirty, ctx };
    			}

    			midicontext.$set(midicontext_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(midicontext.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(midicontext.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(midicontext, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let $editMode;
    	let $configuration;
    	let $selectedMidiOutput;
    	let $editConfiguration;
    	validate_store(editMode, "editMode");
    	component_subscribe($$self, editMode, $$value => $$invalidate(2, $editMode = $$value));
    	validate_store(configuration, "configuration");
    	component_subscribe($$self, configuration, $$value => $$invalidate(3, $configuration = $$value));
    	validate_store(selectedMidiOutput, "selectedMidiOutput");
    	component_subscribe($$self, selectedMidiOutput, $$value => $$invalidate(7, $selectedMidiOutput = $$value));
    	validate_store(editConfiguration, "editConfiguration");
    	component_subscribe($$self, editConfiguration, $$value => $$invalidate(4, $editConfiguration = $$value));
    	window.debugMode = true;
    	set_store_value(editMode, $editMode = false);
    	let configDirty = false;
    	let upgradeString = "";

    	let tips = [
    		"Set a channel to 0 to disable it",
    		"Read the instructions on the back!",
    		"Click Edit Config for device options",
    		"Ignore those eject warnings",
    		"The boot folder is called MT_BOOT"
    	];

    	let tip = tips[Math.floor(Math.random() * tips.length)];

    	editConfiguration.subscribe(c => {
    		if (c && $configuration) {
    			$$invalidate(0, configDirty = !c.isEquivalent($configuration));
    		}
    	});

    	configuration.subscribe(c => {
    		if (c && c.firmwareVersion && window.latestVersion && !window.versionCompared) {
    			let delta = semverCompare(window.latestVersion, c.firmwareVersion);
    			window.versionCompared = true;

    			if (delta > 0) {
    				$$invalidate(1, upgradeString = `A new version of 8mu firmware (${window.latestVersion}) is available.`);
    			} else {
    				$$invalidate(1, upgradeString = "");
    			}
    		}
    	});

    	function handleMessage(message) {
    		switch (message.detail.name) {
    			case "toggleEditMode":
    				toggleEditMode();
    				break;
    			case "transmitConfig":
    				transmitConfig();
    				break;
    			case "requestConfig":
    				OxionMidi.requestConfig($selectedMidiOutput);
    				break;
    			case "importConfig":
    				ImportExport.import($editConfiguration, $configuration, editConfiguration);
    				break;
    			case "exportConfig":
    				ImportExport.export($configuration);
    				break;
    		}
    	}

    	function toggleEditMode() {
    		set_store_value(editMode, $editMode = !$editMode);

    		if ($editMode) {
    			let oldConfig = ConfigurationObject.clone($configuration);
    			editConfiguration.update(c => oldConfig);
    		}
    	}

    	function transmitConfig() {
    		let sysexArray = $editConfiguration.toSysexArray();
    		logger("Sending sysex:", sysexArray);
    		OxionMidi.sendConfiguration($editConfiguration, $selectedMidiOutput);
    		set_store_value(configuration, $configuration = $editConfiguration);
    		set_store_value(editMode, $editMode = !$editMode);
    	}

    	fetch("https://api.github.com/repos/TomWhitwell/Smith-Kakehashi/releases").then(r => r.json()).then(d => {
    		window.latestVersion = d[0].tag_name.replace(/[a-zA-z]/g, "");
    	});

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("configDirty" in $$props) $$invalidate(0, configDirty = $$props.configDirty);
    		if ("upgradeString" in $$props) $$invalidate(1, upgradeString = $$props.upgradeString);
    		if ("tips" in $$props) tips = $$props.tips;
    		if ("tip" in $$props) $$invalidate(5, tip = $$props.tip);
    		if ("$editMode" in $$props) editMode.set($editMode = $$props.$editMode);
    		if ("$configuration" in $$props) configuration.set($configuration = $$props.$configuration);
    		if ("$selectedMidiOutput" in $$props) selectedMidiOutput.set($selectedMidiOutput = $$props.$selectedMidiOutput);
    		if ("$editConfiguration" in $$props) editConfiguration.set($editConfiguration = $$props.$editConfiguration);
    	};

    	return [
    		configDirty,
    		upgradeString,
    		$editMode,
    		$configuration,
    		$editConfiguration,
    		tip,
    		handleMessage
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$f.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
      props: {},
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
