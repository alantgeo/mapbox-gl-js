'use strict';

const latest = require('./reference/latest');

/*
require('flow-remove-types/register')({ all: true });
const deepEqual = require('../util/util').deepEqual;
*/

function deepEqual(a, b) {
    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!exports.deepEqual(a[i], b[i])) return false;
        }
        return true;
    }
    if (typeof a === 'object' && a !== null && b !== null) {
        if (!(typeof b === 'object')) return false;
        const keys = Object.keys(a);
        if (keys.length !== Object.keys(b).length) return false;
        for (const key in a) {
            if (!deepEqual(a[key], b[key])) return false;
        }
        return true;
    }
    return a === b;
};

/**
 * Returns a new key based on the current key not available in takenKeys.
 *
 * @example
 * var nextKey = nextNewKey('name', ['name', 'name1'];
 * // nextKey = 'name2'
 * @private
 */
function nextNewKey (currentKey, takenKeys) {
    let index = 1;
    while (currentKey + index in takenKeys) {
        index++;
    }
    return currentKey + index;
}

/**
 * Merge two styles together, equiverlant to copying layers into a new combined style.
 *
 * @param {Array} styles Array of style objects to merge. Styles appearing first in the array will appear on top of styles appearing later.
 * @param {Object} options
 * @param {boolean} [options.composite=true] If true vector sources are composited together if they have the same id.
 * @param {function} callback Callback invoked with errors, warnings, style containing the result of the merge.
 *
 * @example
 * merge([style1, style2], { composite: true}, function (err, warn, style) {
 *     // err
 *     // warn
 *     // style
 * });
 */
module.exports = function (styles, callback) {
    let errors = [];
    let warnings = [];

    /*
    if (options == undefined) {
        options = {};
    }

    // if not defined set default
    if (!('composite' in options)) {
        options.composite = true;
    }

    if (typeof options == 'function' && callback === undefined) {
        callback = options;
    }
    */

    if (!styles.length) {
        warnings.push({
            index: null,
            message: 'No styles provided, populating with an empty style instead.'
        });
    }

    const mergedStyles = styles.reduce((acc, val, index) => {

        // only the most recent version of the Mapbox Style Specification is supported
        if (val.version != latest['$version']) {
            errors.push({
                index: index,
                message: 'Style version must be latest. Found ' + val.version + ', required ' + latest['$version']
            });
        }

        // merge names
        if ('name' in val) {
            if ('name' in acc) {
                acc.name += ' + ' + val.name;
            } else {
                acc.name = val.name;
            }
        }

        let groupRenames = {}

        // if the new style has a metadata object
        if (val.metadata) {
            // then we'll need to merge it

            // if current style has no metadata object, add an empty one
            if (!acc.metadata) {
                acc.metadata = {};
            }

            // for each new style metadata object
            for (var key in val.metadata) {
                // append mapbox:groups
                if (key === 'mapbox:groups') {
                    // check if will overwrite any groups and warn
                    for (var groupKey in val.metadata['mapbox:groups']) {
                        if (!('mapbox:groups' in acc.metadata)) {
                            acc.metadata['mapbox:groups'] = {};
                        }
                        let newGroupKey = groupKey;
                        if (groupKey in acc.metadata['mapbox:groups']) {
                            newGroupKey = nextNewKey(groupKey, Object.keys(acc.metadata['mapbox:groups']));
                            groupRenames[groupKey] = newGroupKey;
                            warnings.push({
                                index: index,
                                message: 'Detected duplicate mapbox:groups id "' + groupKey + '", renaming as "' + newGroupKey + '" to avoid conflicts.'
                            });
                        }
                        acc.metadata['mapbox:groups'][newGroupKey] = val.metadata['mapbox:groups'][groupKey];
                    }
                } else {
                    // otherwise merge
                    if (val.metadata.hasOwnProperty(key)) {
                        if (key in acc.metadata) {
                            if (acc.metadata[key] !== val.metadata[key]) {
                                warnings.push({
                                    index: index,
                                    message: 'metadata.' + key + ' has conflicting values ("' + acc.metadata[key] + '","' + val.metadata[key] + '"), using "' + acc.metadata[key] + '".'
                                });
                            }
                        } else {
                            acc.metadata[key] = val.metadata[key];
                        }
                    }
                }
            }
        }

        let sourceRenames = {}

        // sources composite combine
        // merge others and reduce duplicates
        for (var key in val.sources) {
            if (key in acc.sources) {
                // already exists
                if (deepEqual(acc.sources[key], val.sources[key])) {
                    // the same so skip
                } else {
                    // different, so rename and append
                    /*
                    if (options.composite && val.sources[key].type === 'vector') {
                        // composite
                        let newSources = val.sources[key].url.replace(/^mapbox:\/\//, '').split(/,/);
                        let existingSources = acc.sources[key].url.replace(/^mapbox:\/\//, '').split(/,/);
                        newSources = newSources.filter( function (source) {
                            return !existingSources.includes(source);
                        });
                        acc.sources[key].url = 'mapbox://' + existingSources + (newSources.length > 0 ? ',' + newSources : '');
                    } else {
                    */
                        // append
                        const newKey = nextNewKey(key, Object.keys(acc.sources));
                        sourceRenames[key] = newKey;
                        acc.sources[newKey] = val.sources[key]
                        warnings.push({
                            index: index,
                            message: 'Detected duplicate source id "' + key + '", renaming as "' + newKey + '" to avoid conflicts.'
                        });
                    //}
                }
            } else {
                acc.sources[key] = val.sources[key];
            }
        }

        // for any sources which re-id, update the references to the new ids in the layers
        const newLayers = val.layers.map(function (layer) {
            if (layer.source in sourceRenames) {
                layer.source = sourceRenames[layer.source];
            }
            return layer;
        });

        // append layers
        const existingLayerIds = acc.layers.map((layer) => { return layer.id; });
        const reIdedLayers = newLayers.map((layer) => {
            if (existingLayerIds.indexOf(layer.id) >= 0) {
                layer.id = nextNewKey(layer.id, existingLayerIds);
            }
            if (layer.metadata && layer.metadata['mapbox:group'] in groupRenames) {
                layer.metadata['mapbox:group'] = groupRenames[layer.metadata['mapbox:group']];
            }
            return layer;
        });
        Array.prototype.push.apply(acc.layers, reIdedLayers);

        if (acc.sprite && acc.sprite !== val.sprite) {
            warnings.push({
                index: index,
                message: "Sprite can't be merged. Found " + acc.sprite + ' and ' + val.sprite
            });
        }
        acc.sprite = val.sprite;

        if (acc.glyphs && acc.glyphs !== val.glyphs) {
            errors.push({
                index: index,
                message: "Glyphs can't be merged. Found \"" + acc.glyphs + '" and "' + val.glyphs + '"'
            });
        }
        acc.glyphs = val.glyphs;

        // if any is set to private, set the new style as private
        acc.visibility = (acc.visibility == 'private' || val.visibility == 'private') ? 'private' : acc.visibility;

        return acc;
    }, {
        version: latest['$version'],
        sources: {},
        layers: []
    });

    // can't merge these fields
    delete mergedStyles['created'];
    delete mergedStyles['id'];
    delete mergedStyles['modified'];
    delete mergedStyles['owner'];
    delete mergedStyles['draft'];

    callback(errors.length ? errors : null, warnings.length ? warnings : null, mergedStyles);
};
