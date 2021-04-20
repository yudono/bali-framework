function Bali(root = document.querySelector('body'), options = { render: true }) {
    this.root = root // root element app
    this.listen = [] // listens array element
    this.tmp = {}
    this.if_argument = '' // last argument if else
    this.render_id = '' // active render id
    this.alias = {
            class: 'className',
            html: 'innerHTML'
        } // default alias
    window.state = {} //set state

    if (typeof(root) == 'object') {
        this.init(root.children)
    } else {
        throw new Error(`the bali parameter should be an element and an option\n\nexample:\nBali (document.querySelector ('body'), {})\n\nparameter 1: document.querySelector ('body')\nparameter 2 (optional): {}\n`)
    }

    // set other alias options
    if (typeof(options.alias) == 'object') {
        this.alias = {
            ...this.alias,
            ...options.alias
        }
    }

    // set render
    if (typeof(options.render) == 'boolean') {
        if (true) {
            let id = this.elementToId(this.root)
            this.render(id)
        }
    }

    // call first time to change state
    this.trigger()
}

// init program
Bali.prototype.init = function(root) {
    Array.from(root).forEach(child => {
        if (child.children.length > 0) {
            this.init(child.children) // recursive html tag
        }

        let attributes = child.getAttributeNames() // all attributes from root app
        attributes.forEach(attr => {
            // when there is an attribute marked $
            // like $html
            if (attr.indexOf('$') > -1) {

                let tag = attr.substr(1) // get the attribute without $

                // if the attribute is an event listener
                if (typeof(child['on' + tag]) != 'undefined') {
                    child.addEventListener(tag, (function(e) {
                        let value = child.getAttribute(attr) // get the attribute value
                        this.execute(child, value)
                        this.trigger()
                    }).bind(this))
                } else {
                    // set the if to be removed
                    if (tag == 'if' || tag == 'else') {
                        child.style.display = 'none' // hide elements
                    }

                    let id = this.elementToId(child) // get id
                    this.listen.push([id, tag]) // add to the listen array
                }
            }
        })
    })
}

// generate an id if it doesn't exist yet
Bali.prototype.elementToId = function(element) {
    if (element.id == '') { // if id is empty
        const _random = Math.random().toString().substr(2)
        element.id = _random
    }
    return element.id
}

// get elements based on id
Bali.prototype.idToElement = function(id) {
    return document.getElementById(id) || document.querySelector(id)
}

// value execution
Bali.prototype.execute = function(element, value, context = false) {
    let id = this.elementToId(element) // generate an id if it doesn't exist yet
    if (context == false) {
        // Empty context is the context based on the current element
        value = value.replace(/\$/g, 'document.getElementById(\'' + id + '\')').replace('/document.getElementById(\'' + id + '\')', '$')
    } else {
        // This context contains the window.state fragment object
        context = context.replace(/\'/g, '')
        if (typeof(window.state[context]) != 'object') {
            window.state[context] = []
        }
        value = value.replace(/\$/g, 'window.state[\'' + context + '\']').replace('/window.state[\'' + context + '\']', '$')
    }

    // change the value based on an existing alias
    Object.keys(this.alias).forEach(y => {
        value = value.replace(new RegExp(y, "g"), this.alias[y])
    })

    return eval(value) // returns result data
}

// make changes to data
Bali.prototype.trigger = function() {
    // console.log(this.listen)
    this.listen.forEach(item => {
        let element = this.idToElement(item[0]) // get element
        let attribute = item[1] // get attribute
        let attribute_real = attribute
        let attribute_value = element.getAttribute('$' + attribute) // get attribute value

        // get the original attribute name
        Object.keys(this.alias).forEach(attr => {
            attribute_real = attribute_real.replace(new RegExp(attr, "g"), this.alias[attr])
        })

        // if(attribute())
        if (attribute == 'if') {
            if (this.execute(element, attribute_value)) {
                //if true
                element.style.display = 'block'
                this.if_argument = '' // if true
            } else {
                element.style.display = 'none'
                this.if_argument = attribute_value // if false
            }
        } else if (attribute == 'else') { // else attribute
            if (!this.execute(element, this.if_argument) && this.if_argument != '') {
                element.style.display = 'block'
            } else {
                element.style.display = 'none'
            }
            this.if_argument = '' // clear
        } else if (attribute == 'for') {
            let count = this.execute(element, attribute_value)
            let current_html = element.innerHTML // the current html text
            let html = ''

            if (count >= 0) {
                for (var i = 1; i <= count; i++) {
                    html += current_html.replace('$index', i)
                }
            } else {
                for (var i = -1; i >= count; i--) {
                    html += current_html.replace('$index', i)
                }
            }
            element.innerHTML = html
        } else if (attribute == 'foreach') {
            let object = this.execute(element, 'window.foreach = ' + attribute_value)
            let current_html = element.innerHTML // the current html text
            let html = ''

            if (typeof(object) == 'object') {
                Object.keys(object).forEach(key => {
                    html += current_html.replace('$key', key).replace('$value', object[key])
                })

                element.innerHTML = html
            } else {
                throw new Error('foreach parameters must be object\n\nexample:\n<div $foreach="{name: \'john doe\'}">\n\t<div> my $ key is $ value </div>\n</div>\n')
            }
        } else {
            // if the attribute does not contain bind
            if (attribute.split(':').length == 1) {
                if (typeof(element[attribute_real]) != 'undefined') {
                    element[attribute_real] = this.execute(element, attribute_value)
                } else {
                    element.setAttribute(attribute_real, this.execute(element, attribute_value))
                }
            } else if (attribute.split(':').length == 2) {
                let isbind = attribute.split(':')[0]
                let isattrbind = attribute.split(':')[1]
                if (isbind == 'bind') {
                    // get the original attribute name
                    Object.keys(this.alias).forEach(attr => {
                            attribute_real = isattrbind.replace(new RegExp(attr, "g"), this.alias[attr])
                        }) // set attribute

                    let state = this.getState(item[0])
                    state = state != undefined ? state[attribute_real] : undefined
                    if (state == undefined) {
                        this.setState(item[0], {
                            [attribute_real]: element[attribute_real]
                        })
                    }

                    if (typeof(element[attribute_real]) != 'undefined') {
                        element[attribute_real] = this.getState(item[0])[attribute_real] + this.execute(element, attribute_value)
                    } else {
                        element.setAttribute(attribute_real, this.execute(element, attribute_value))
                    }

                } else {
                    throw new Error('invalid attribute\n\nuse attribute with $ and attribute name\n\nexample :\n<div $html="2+2"> </div>\n');
                }
            } else {
                throw new Error('invalid attribute\n\nuse attribute with $ and attribute name\n\nexample :\n<div $html="2+2"> </div>\n');
            }
        }
    })

    // re-render when changes are made
    if (typeof(this.render_id) == 'object') {
        this.render_id.forEach(rId => this.reRender(this.tmp[rId]))
    } else if (typeof(this.render_id) == 'string') {
        if (this.tmp[this.render_id] != undefined) {
            this.reRender(this.tmp[this.render_id])
        }
    } else {
        throw new Error('the render parameter must be a string or an array\n\nexample :\nlet bali = new Bali()\nbali.render (\'.app\')\n\nor\n\nbali.render ([\'.app1\', \'.app2\'])')
    }
}

// setstate object window
Bali.prototype.setState = function(element, object) {
    if (typeof(window.state[element]) != 'object') {
        window.state[element] = []
    }
    window.state[element] = {...window.state[element], ...object }
}

// getstate object window
Bali.prototype.getState = function(element) {
    return window.state[element]
}

Bali.prototype.render = function(id, options = { fragments: [] }) {
    this.render_id = id
    if (typeof(id) == 'object') {
        // if id multiple
        id.forEach(e => this._render(e, options))
    } else {
        // if only one id
        this._render(id, options)
    }
}
Bali.prototype._render = function(id, options = { fragments: [] }) {
    let element = this.idToElement(id) // element

    // for templating fragment
    options.fragments.forEach(e => {
        if (element.querySelector(e) != null) {
            let fragment = element.querySelector(e)
            let fragment_template = document.querySelector('[fragment=\'' + e + '\']').innerHTML
            let children = fragment.innerHTML
            fragment.innerHTML = fragment_template
            for (let i = 0; i < fragment.attributes.length; i++) {
                let _key = fragment.attributes[i].name
                let _value = fragment.attributes[i].value
                this.setState(id, {
                    [e]: {
                        [_key]: _value,
                        children: children
                    }
                })
            }
        }
    })

    // rendering code with the $ symbol
    if (typeof(element.children) == 'object') {
        Array.from(element.children).forEach(child => {
            let ids = this.elementToId(child)
            let current_html = child.innerHTML

            if (child.tagName != 'SCRIPT') {
                if (typeof(child.innerText) == 'string') {
                    let value = child.innerText
                    value = value.match(/\$\{(.*?)\}/g)
                    if (value != null) {

                        if (this.tmp[id] == undefined) {
                            this.tmp[id] = {}
                        }
                        this.tmp[id][ids] = []

                        let code = []
                        value.forEach(e => {
                            let func = e.substring(2, e.length - 1)
                            let output = this.execute(child, func, id)
                                // let output = this.execute(child, func, ids)
                            code.push(e)
                            child.innerHTML = child.innerHTML.replace('${' + func + '}', output)
                        })
                        this.tmp[id][ids].push([code, ids, current_html])
                    }
                }
            }
        })
    }
}

Bali.prototype.reRender = function(item) {
    Object.keys(item).forEach(id => {
        let element = this.idToElement(id)
        let data = item[id][0]
        let html = data[2]

        data[0].forEach(code => {
            // code execution one by one
            code = code.substring(2, code.length - 1)
            let output = this.execute(element, code, id)
            html = html.toString().replace('${' + code + '}', output)
        })
        element.innerHTML = html
    })
}

// function getConsummer(name) {
//     return document.querySelector('[consummer="' + name + '"]')
// }

// function getConsumerAll(name) {
//     return document.querySelectorAll('[consummer="' + name + '"]')
// }