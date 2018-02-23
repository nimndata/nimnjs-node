var chars = require("./chars").chars;
var dataType = require("./schema").dataType;
var getKey = require("./util").getKey;
var charsArr = require("./chars").charsArr;

var encode = function(jObj,e_schema){
    var isData1 = hasData(jObj);
    if(isData1 !== true){
        return isData1;
    }
    var properties = e_schema.properties;
    var keys = Object.keys(properties);
    var len = keys.length;
    
    var str = "";
    for(var i=0; i< len; i++){
        var key = keys[i];
        var nextKey = keys[i+1];
        if(properties[key].type.value === dataType.ARRAY.value){
            var isData = hasData(jObj[key]);
            if(isData === true){
                var itemSchema = getKey(properties[key].properties,0);
                var itemSchemaType = itemSchema.type;
                var arr_len = jObj[key].length;
                str = appendBoundryCharIfNeeded(str,jObj[key][0]);
                for(var arr_i=0;arr_i < arr_len;arr_i++){
                    //if arraySepChar presents, next item is an array item.
                    if(itemSchemaType.value !== dataType.ARRAY.value && itemSchemaType.value !== dataType.OBJECT.value ){
                        str += checkForNilOrUndefined(jObj[key][arr_i],itemSchemaType);
                    }else{
                        var r =  encode(jObj[key][arr_i],itemSchema) ;
                        str = processObject(str,r);
                    }
                    if(arr_len > arr_i+1){
                        str += chars.arraySepChar;
                    }
                }
                str = appendBoundryCharIfNeeded(str);
            }else{
                str += isData;
            }
        }else if(properties[key].type.value === dataType.OBJECT.value){
            var isData = hasData(jObj[key]);
            if(isData === true){
                var itemType = properties[key];
                //boundry chars is needed for decoding
                str = appendBoundryCharIfNeeded(str);
                var r = encode(jObj[key],itemType)
                str = processObject(str,r);
            }else{
                str += isData;
            }
        }else{
            str = appendBoundryCharIfNeeded(str,jObj[key]);
            str += checkForNilOrUndefined(jObj[key],properties[key].type);
        }
    }
    return str;
}

function processObject(str,r){
    if(r === chars.emptyChar && chars.boundryChar  === str[str.length -1]){
        str = str.replace(/.$/,chars.emptyChar);
    }else{
        if(!isAppChar(r[0]) && ( str.length > 0 && !isAppChar(str[str.length-1]))){
            str += chars.boundryChar + r;
        }else{
            str += r;
        }
    }
    return str
}

var checkForNilOrUndefined= function(a,type){
    if(a === undefined || a === null) return chars.nilPremitive;
    else return type.parse(a);
}

/**
 * Check if the given object is empty, null, or undefined. Returns true otherwise.
 * @param {*} jObj 
 */
function hasData(jObj){
    if(jObj === undefined || jObj === null){
        return chars.nilChar;
    }else  if( jObj.length === 0 || Object.keys(jObj).length === 0){
        return chars.emptyChar;
    }else{
        return true;
    }
}

/**
 * Append Boundry char if last char or next char are not null/missing/empty char
 * @param {*} str 
 */
function appendBoundryCharIfNeeded(str,next){
    if( str.length > 0 && !isAppChar(str[str.length -1]) &&  !isNonDataValue(next) ){
            str += chars.boundryChar;
    }
    return str;
}

var nonDataArr = [null, undefined, true, false]
function isNonDataValue(ch){
    return nonDataArr.indexOf(ch) !== -1 
    || ( typeof ch === "object" && ch.length === 0 );
}

function isAppChar(ch){
    return charsArr.indexOf(ch) !== -1;
}

exports.encode= encode;