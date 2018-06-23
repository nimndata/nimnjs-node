(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.nimn = f()}})(function(){var define,module,exports;return (function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
var char = function (a){
    return String.fromCharCode(a);
}

var range = {
    start : char(175),
    end : char(188),
}
const chars= {
    nilChar : char(176),
    nilPremitive : char(175),

    missingChar : char(186),
    missingPremitive : char(184),

    emptyChar : char(178),
    emptyPremitive:  char(177),//empty Premitive
    
    boundaryChar : char(179),
    fieldNameBoundaryChar : char(188),
    
    objStart: char(182),
    objEnd: char(180),
    arrStart: char(187),
    arrEnd: char(185),

    yes: char(181),
    no: char(183),
}

var DataType = {
    BOOLEAN : 1,
    LIST : 2,
    MAP : 3,
    VARMAP : 4,
    STRING : 5,
    NUMBER : 6,
}

/* var decodeNimnChar = {};
decodeNimnChar[char(175)] = null;
decodeNimnChar[char(184)] = undefined;
decodeNimnChar[char(177)] = "";
decodeNimnChar[char(181)] = true;
decodeNimnChar[char(183)] = false; */

/* var booleanValues = {};
booleanValues[undefined] = chars.missingPremitive;
booleanValues[null] = chars.nilPremitive;
booleanValues[true] = chars.yes;
booleanValues[false] = chars.no;

var stringValues = {};
stringValues[undefined] = chars.missingPremitive;
stringValues[null] = chars.nilPremitive;
stringValues[""] = chars.emptyPremitive;

var numberValues = {};
numberValues[undefined] = chars.missingPremitive;
numberValues[null] = chars.nilPremitive; */

function BooleanType(fName, defaultVal){
    this._name = fName;
    this._type = DataType.BOOLEAN;

    this._decodeChar = {};
    this._decodeChar[char(175)] = null;
    this._decodeChar[char(184)] = defaultVal;
    this._decodeChar[char(181)] = true;
    this._decodeChar[char(183)] = false;

    this._encode = function(v){
        if(v){
            return chars.yes;
        }else if(v === false){
            return chars.no;
        }else if(v === undefined){
            return chars.missingPremitive;
        }else if(v === null){
            return chars.nilPremitive;
        }
        //return booleanValues[v];
    };
    this._decode = function(v,i){
        return {
            index: i+1,
            value: this._decodeChar[ v[i] ]
        }
    };
}

function StringType(fName, defaultVal, shouldSanitize){
    this._name = fName;
    this._type = DataType.STRING;
    this._sanitize = shouldSanitize ? sanitize : doNothing;
    this._removeBackspace = shouldSanitize ? removeBackspace : doNothing;

    this._decodeChar = {};
    this._decodeChar[char(175)] = null;
    this._decodeChar[char(184)] = defaultVal;
    this._decodeChar[char(177)] = "";

    this._encode = function (v){
        v = "" + v;
        if(v){
            return this._sanitize(v);
        }else if(v === undefined){
            return chars.missingPremitive;
        }else if(v === null){
            return chars.nilPremitive;
        }else if(v === ""){
            return chars.emptyPremitive;
        }
        //return stringValues[v] || sanitize(v);
    };
    this._decode = function(v,i){
        if( inRange(v[i])){
            return {
                index: i+1,
                value: this._decodeChar[ v[i] ]
            }
        }else{
            var nextIndex = read(v,i);
            return { index: nextIndex, value: this._removeBackspace( v.substring(i,nextIndex) )};
        }
    };
}

function NumberType(fName, defaultVal){
    this._name = fName;
    this._type = DataType.NUMBER;

    this._decodeChar = {};
    this._decodeChar[char(175)] = null;
    this._decodeChar[char(184)] = defaultVal;

    this._encode = function(v){
        if(v === undefined){
            return chars.missingPremitive;
        }else if(v === null){
            return chars.nilPremitive;
        }else {
            return v;
        }

        //return numberValues[v] || v;
    };
    this._decode = function(v,i){
        if( inRange(v[i]) ){
            return {
                index: i+1,
                value: this._decodeChar[ v[i] ]
            }
        }else{
            var nextIndex = read(v,i);
            var val = v.substring(i,nextIndex);
            if(val.indexOf(".") === -1){
                val = Number.parseInt(val);
            }else{
                val = Number.parseFloat(val);
            }
            return { index: nextIndex, value: val};
        }
    };
}

function MapType(fName){
    this._name = fName;
    this._type = DataType.MAP;
    this._keys = [];
    this._len = 0;
    this._encode = function(v){
        if(v === undefined){
            return chars.missingChar;
        }else if(v === null){
            return chars.nilChar;
        }else if(Object.keys(v).length === 0){
            return chars.emptyChar;
        }else {
            var str = this._keys[0]._encode( v[ this._keys[0]._name ] );
            var wasNimnChar = startsWithNimnChar(str,this._keys[0]);
            for(var i=1; i < this._len; i++){
                var newStr = this._keys[i]._encode( v[ this._keys[i]._name ] );
                var isNimnChar = startsWithNimnChar(newStr,this._keys[i]);
                if( isNimnChar || wasNimnChar ){
                    str += newStr;
                }else{
                    str += `${chars.boundaryChar}${newStr}`;
                }
                wasNimnChar = isNimnChar;
            }
            return `${chars.objStart}${str}${chars.objEnd}`;
        }
    };
    this._decode = function(v,i){
        if(v[i] === chars.emptyChar){
            return {index: i+1, value: {} };
        }else if(v[i] === chars.missingChar){
            return {index: i+1, value: undefined };
        }else if(v[i] === chars.nilChar){
            return {index: i+1, value: null }
        }else if(v[i] === chars.objStart){
            i++;
            var currentObj = {};
            var str = this._keys[0]._decode( v,i );
            i = str.index;
            if(str.value !== undefined){
                currentObj[ this._keys[ 0 ]._name ] = str.value;
            }
            for(var key_i=1; key_i < this._len && v[i] !== chars.objEnd; key_i++){
                var keyVal ;
                if(v[i] === chars.boundaryChar){
                    keyVal = this._keys[ key_i ]._decode( v,i +1 );
                }else{
                    keyVal = this._keys[ key_i ]._decode( v,i );
                }
                i = keyVal.index;
                if(keyVal.value !== undefined){
                    currentObj[ this._keys[ key_i ]._name ] = keyVal.value;
                }
            }
            return {
                index : i+1,
                value: currentObj
            }
        }else{
            throw Error("Invalid character at position " + i);
        }
    };
}

function ListType(fName){
    this._name = fName;
    this._type = DataType.LIST;
    this._item = null;
    this._encode = function (v){
        if(v === undefined){
            return chars.missingChar;
        }else if(v === null){
            return chars.nilChar;
        }else if(v.length === 0){
            return chars.emptyChar;
        }else {
            var len = v.length;
            var str = this._item._encode( v[ 0 ] );
            var wasNimnChar = startsWithNimnChar(str,this._item);
            for(var i=1; i < len; i++){
                var newStr = this._item._encode( v[ i ] );
                var isNimnChar = startsWithNimnChar(newStr,this._item);
                if( isNimnChar || wasNimnChar ){
                    str += newStr;
                }else{
                    str += `${chars.boundaryChar}${newStr}`;
                }
                wasNimnChar = isNimnChar;
            }
            return `${chars.arrStart}${str}${chars.arrEnd}`;
        }
    };
    this._decode = function(v,i){
        if(v[i] === chars.emptyChar){
            return {index: i+1, value: []};
        }else if(v[i] === chars.missingChar){
            return {index: i+1, value: undefined };
        }else if(v[i] === chars.nilChar){
            return {index: i+1, value: null }
        }else if(v[i] === chars.arrStart){
            i++;
            var currentArr = [];
            var str = this._item._decode( v,i );
            i = str.index;
            if(str.value !== undefined)
                currentArr.push(str.value);
            
            for( ; v[i] !== chars.arrEnd ;){
                var itemVal;
                if(v[i] === chars.boundaryChar){
                    itemVal = this._item._decode( v,i +1 );
                }else{
                    itemVal = this._item._decode( v,i );
                }
                i = itemVal.index;
                if(itemVal.value !== undefined)
                    currentArr.push(itemVal.value);
            }

            return {
                index : i+1,
                value: currentArr
            }
        }else{
            throw Error("Invalid character at position " + i);
        }
        };
}

function VarMapType(fName){
    this._name = fName;
    this._type = DataType.VARMAP;
    this._item = null;
    this._encode = function (v){
        if(v === undefined){
            return chars.missingChar;
        }else if(v === null){
            return chars.nilChar;
        }else if(Object.keys(v).length === 0){
            return chars.emptyChar;
        }else {
            var keys = Object.keys(v);
            var len = keys.length;
            var str =  this._item._encode( v[ keys[0] ] );
            var wasNimnChar = startsWithNimnChar(str,this._item);
            str = keys[0] + chars.fieldNameBoundaryChar + str;

            for(var i=1; i < len; i++){
                var newStr = this._item._encode( v[ keys[i] ] );
                var isNimnChar = startsWithNimnChar(newStr,this._item);
                newStr = keys[i] + chars.fieldNameBoundaryChar + newStr;

                if( wasNimnChar ){
                    str += newStr;
                }else{
                    str += `${chars.boundaryChar}${newStr}`;
                }
                wasNimnChar = isNimnChar;
            }
            return `${chars.arrStart}${str}${chars.arrEnd}`;
        }
    };
    this._decode = function(v,i){
        if(v[i] === chars.emptyChar){
            return {index: i+1, value: {}};
        }else if(v[i] === chars.missingChar){
            return {index: i+1, value: undefined };
        }else if(v[i] === chars.nilChar){
            return {index: i+1, value: null }
        }else if(v[i] === chars.arrStart){
            i++;
            var currentObj = {};
            //get the index of first chars.fieldNameBoundaryChar after i
            var indexOfFieldSeparator = read(v,i);
            var fieldName = v.substring( i, indexOfFieldSeparator );
            i = indexOfFieldSeparator + 1;
            var str = this._item._decode( v,i );
            i = str.index;
            if(str.value !== undefined)
                currentObj[fieldName] = str.value;
            
            for( ; v[i] !== chars.arrEnd ;){
                var itemVal;
                if(v[i] === chars.boundaryChar){
                    i++;
                }
                var indexOfFieldSeparator = read(v,i);
                var fieldName = v.substring( i, indexOfFieldSeparator );
                i = indexOfFieldSeparator + 1;
                itemVal = this._item._decode( v,i );
                i = itemVal.index;
                if(itemVal.value !== undefined)
                    currentObj[fieldName] = itemVal.value;
            }

            return {
                index : i+1,
                value: currentObj
            }
        }else{
            throw Error("Invalid character at position " + i);
        }
        };
}

function buildSchema(schema, shouldSanitize){
    if(shouldSanitize !== false){
        shouldSanitize = true;
    }

    if(schema.type === "map"){
        var mapSchema = new MapType(schema.name);
        mapSchema._keys = [];
        mapSchema._len = schema.detail.length;
        for(var i=0; i < mapSchema._len; i++){
            mapSchema._keys.push( buildSchema(schema.detail[i], shouldSanitize ) );
        }
        return mapSchema;
    }else if(schema.type === "list"){
        var listSchema = new ListType(schema.name);
        listSchema._item = buildSchema(schema.detail, shouldSanitize);
        return listSchema;
    }else if(schema.type === "varmap"){
        var listSchema = new VarMapType(schema.name);
        listSchema._item = buildSchema(schema.detail, shouldSanitize);
        return listSchema;
    }else if(schema.type === "boolean"){
        return new BooleanType(schema.name, schema.default);
    }else  if(schema.type === "string"){
        return new StringType(schema.name, schema.default, shouldSanitize);
    }else{//number
        return new NumberType(schema.name, schema.default);
    }
}

function parse(schema, jsObj){
    return schema._encode(jsObj);
}

function parseBack(schema, nimnData){
    return schema._decode(nimnData,0).value;
}

function startsWithNimnChar(str, type){
    return type._type < 5 || ( str.length === 1 && inRange(str) );
}

//var nimnCharRegx = new RegExp("([\xAF\xB0\xB1\xB2\xB3\xB4\xB5\xB6\xB7\xB8\xB9\xBA\xBB])", 'g');
var nimnCharRegx = new RegExp("[^\]([\xAF-\xBB])", 'g');
/* function sanitize(v){
    return v.replace(nimnCharRegx,'\\$1');
    //return v;
} */

function inRange(v){
    return v >= range.start && v <= range.end;
}
function read(str,from,to){
    to = to || str.length;
    for(;from < to;from++){
        if( inRange(str[ from ]) && str[ from -1 ] !== "\\"){
            return from;
        }
    }
    return to;
}

function sanitize(str){
    var newStr = "";
    for(var i=0;i < str.length;i++){
        if( inRange( str[ i]  ) ){
            newStr += `\\${str[ i]}`
        }else{
            newStr += str[ i];
        }
    }
    return newStr;
}

function removeBackspace(str){
    var newStr = "";
    for(var i=0;i < str.length;i++){
        if( str[ i ] === "\\" && inRange( str[ i +1 ]  )){
            continue;
        }
        newStr += str[ i ];
    }
    return newStr;
}

function doNothing(a){
    return a;
}
exports.buildSchema = buildSchema;
exports.stringify = parse;
exports.parse = parseBack;
exports.chars = chars;
},{}]},{},[1])(1)
});