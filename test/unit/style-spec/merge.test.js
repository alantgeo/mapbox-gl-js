'use strict';

const test = require('mapbox-gl-js-test').test;
const merge = require('../../../src/style-spec/merge');

test('no names', (t) => {
    merge([{
        "version": 8,
        "sources": {},
        "layers": []
    },{
        "version": 8,
        "sources": {},
        "layers": []
    }], (errors, warnings, result) => {
        t.false(errors, 'expects no errors');
        t.false(warnings, 'expects no warnings');
        t.false(result.name);
        t.end();
    });
});

test('merge one name (first)', (t) => {
    merge([{
        "version": 8,
        "name": "A",
        "sources": {},
        "layers": []
    },{
        "version": 8,
        "sources": {},
        "layers": []
    }], (errors, warnings, result) => {
        t.false(errors, 'expects no errors');
        t.false(warnings, 'expects no warnings');
        t.equal(result.name, "A");
        t.end();
    });
});

test('merge one name (second)', (t) => {
    merge([{
        "version": 8,
        "sources": {},
        "layers": []
    },{
        "version": 8,
        "name": "B",
        "sources": {},
        "layers": []
    }], (errors, warnings, result) => {
        t.false(errors, 'expects no errors');
        t.false(warnings, 'expects no warnings');
        t.equal(result.name, "B");
        t.end();
    });
});

test('merge two names', (t) => {
    merge([{
        "version": 8,
        "name": "A",
        "sources": {},
        "layers": []
    },{
        "version": 8,
        "name": "B",
        "sources": {},
        "layers": []
    }], (errors, warnings, result) => {
        t.false(errors, 'expects no errors');
        t.false(warnings, 'expects no warnings');
        t.equal(result.name, "A + B");
        t.end();
    });
});

test('drop fields for new style', (t) => {
    merge([{
        "version": 8,
        "sources": {},
        "layers": [],
        "created": "yesterday",
        "id": "foo",
        "modified": "today",
        "owner": "me",
        "draft": true
    },{
        "version": 8,
        "sources": {},
        "layers": [],
        "created": "yesterday",
        "id": "bar",
        "modified": "today",
        "owner": "me",
        "draft": true
    }], (errors, warnings, result) => {
        t.false(errors, 'expects no errors');
        t.false(warnings, 'expects no warnings');
        t.false('created' in result);
        t.false('id' in result);
        t.false('modified' in result);
        t.false('owner' in result);
        t.false('draft' in result);
        t.true('version' in result);
        t.end();
    });
});

test('merge styles distinct ids', (t) => {
    merge([{
        "version": 8,
        "sources": {
            "mapbox-a": {
                "type": "vector",
                "url": "mapbox://a"
            }
        },
        "layers": [{
            "id": "a",
            "type": "line",
            "source": "mapbox-a"
        }]
    },{
        "version": 8,
        "sources": {
            "mapbox-b": {
                "type": "vector",
                "url": "mapbox://b"
            }
        },
        "layers": [{
            "id": "b",
            "type": "line",
            "source": "mapbox-b"
        }]
    }], (errors, warnings, result) => {
        t.false(errors, 'expects no errors');
        t.false(warnings, 'expects no warnings');
        t.deepEqual(result.sources, {
            "mapbox-a": {
                "type": "vector",
                "url": "mapbox://a"
            },
            "mapbox-b": {
                "type": "vector",
                "url": "mapbox://b"
            }
        }, 'merged sources');

        t.deepEqual(result.layers, [
            {
                "id": "a",
                "type": "line",
                "source": "mapbox-a"
            },
            {
                "id": "b",
                "type": "line",
                "source": "mapbox-b"
            }
        ], 'merged layers');

        t.end();
    });
});

test('merge styles shared source ids', (t) => {
    merge([{
        "version": 8,
        "sources": {
            "mapbox": {
                "type": "vector",
                "url": "mapbox://a"
            }
        },
        "layers": [{
            "id": "a",
            "type": "line",
            "source": "mapbox"
        }]
    },{
        "version": 8,
        "sources": {
            "mapbox": {
                "type": "vector",
                "url": "mapbox://b"
            }
        },
        "layers": [{
            "id": "b",
            "type": "line",
            "source": "mapbox"
        }]
    }], (errors, warnings, result) => {
        t.false(errors, 'expects no errors');
        t.deepEqual(warnings, [{
            index: 1,
            message: 'Detected duplicate source id "mapbox", renaming as "mapbox1" to avoid conflicts.'
        }], 'expects a source id rename warning');

        t.deepEqual(result.sources, {
            "mapbox": {
                "type": "vector",
                "url": "mapbox://a"
            },
            "mapbox1": {
                "type": "vector",
                "url": "mapbox://b"
            }
        }, 'merged sources');

        t.deepEqual(result.layers, [
            {
                "id": "a",
                "type": "line",
                "source": "mapbox"
            },
            {
                "id": "b",
                "type": "line",
                "source": "mapbox1"
            }
        ], 'merged layers');

        t.end();
    });
});

test('merge visibility', (t) => {
    merge([{
        "version": 8,
        "sources": {},
        "layers": [],
        "visibility": "private"
    }, {
        "version": 8,
        "sources": {},
        "layers": []
    }], (errors, warnings, result) => {
        t.false(errors, 'expects no errors');
        t.false(warnings, 'expects no warnings');
        t.equal(result.visibility, "private", 'merging private and public styles results in a private style');
        t.end();
    });
});

test('merge equal glyphs', (t) => {
    const glyphs = "mapbox://fonts/username/{fontstack}/{range}.pbf";
    merge([{
        "version": 8,
        "sources": {},
        "layers": [],
        "glyphs": glyphs
    }, {
        "version": 8,
        "sources": {},
        "layers": [],
        "glyphs": glyphs
    }], (errors, warnings, result) => {
        t.false(errors, 'expects no errors');
        t.false(warnings, 'expects no warnings');
        t.equal(result.glyphs, glyphs, 'equal glyphs');
        t.end();
    });
});

test('error on different glyphs', (t) => {
    merge([{
        "version": 8,
        "sources": {},
        "layers": [],
        "glyphs": "mapbox://fonts/username1/{fontstack}/{range}.pbf"
    }, {
        "version": 8,
        "sources": {},
        "layers": [],
        "glyphs": "mapbox://fonts/username2/{fontstack}/{range}.pbf"
    }], (errors, warnings, result) => {
        t.deepEqual(errors, [{
            index: 1,
            message: "Glyphs can't be merged. Found \"mapbox://fonts/username1/{fontstack}/{range}.pbf\" and \"mapbox://fonts/username2/{fontstack}/{range}.pbf\""
        }], 'expects different glyphs error');
        t.false(warnings, 'expects no warnings');
        t.end();
    });
});

test('merge styles shared layer ids', (t) => {
    merge([{
        "version": 8,
        "sources": {
            "mapbox": {
                "type": "vector",
                "url": "mapbox://a1"
            }
        },
        "layers": [{
            "id": "a",
            "type": "line",
            "source": "mapbox"
        }]
    },{
        "version": 8,
        "sources": {
            "mapbox": {
                "type": "vector",
                "url": "mapbox://a2"
            }
        },
        "layers": [{
            "id": "a",
            "type": "symbol",
            "source": "mapbox"
        }]
    }], (errors, warnings, result) => {
        t.false(errors, 'expects no errors');
        t.deepEqual(warnings, [{
            index: 1,
            message: 'Detected duplicate source id "mapbox", renaming as "mapbox1" to avoid conflicts.'
        }], 'expects a source id rename warning');

        t.deepEqual(result.sources, {
            "mapbox": {
                "type": "vector",
                "url": "mapbox://a1"
            },
            "mapbox1": {
                "type": "vector",
                "url": "mapbox://a2"
            }
        }, 'merged sources');

        t.deepEqual(result.layers, [
            {
                "id": "a",
                "type": "line",
                "source": "mapbox"
            },
            {
                "id": "a1",
                "type": "symbol",
                "source": "mapbox1"
            }
        ], 'merged layers');

        t.end();
    });
});

test('merge styles metadata', (t) => {
    merge([{
        "version": 8,
        "metadata": {
            "mapbox:groups": {
                "group1": {
                    "name": "foo"
                }
            }
        },
        "sources": {},
        "layers": [{
            "id": "a",
            "type": "line",
            "metadata": {
                "mapbox:group": "group1"
            }
        }]
    },{
        "version": 8,
        "metadata": {
            "mapbox:groups": {
                "group2": {
                    "name": "bar"
                }
            }
        },
        "sources": {},
        "layers": [{
            "id": "b",
            "type": "line",
            "metadata": {
                "mapbox:group": "group2"
            }
        }]
    }], (errors, warnings, result) => {
        t.false(errors, 'expects no errors');
        t.false(warnings, 'expects no warnings');

        t.deepEqual(result.metadata, {
            "mapbox:groups": {
                "group1": {
                    "name": "foo"
                },
                "group2": {
                    "name": "bar"
                }
            }
        }, 'merged metadata mapbox:groups');

        t.deepEqual(result.layers, [
            {
                "id": "a",
                "type": "line",
                "metadata": {
                    "mapbox:group": "group1"
                }
            },
            {
                "id": "b",
                "type": "line",
                "metadata": {
                    "mapbox:group": "group2"
                }
            }
        ], 'merged layers with groups');

        t.end();
    });
});

test('merge styles metadata mapobx:groups conflicting ids', (t) => {
    merge([{
        "version": 8,
        "metadata": {
            "mapbox:groups": {
                "group": {
                    "name": "foo"
                }
            }
        },
        "sources": {},
        "layers": [{
            "id": "a",
            "type": "line",
            "metadata": {
                "mapbox:group": "group"
            }
        }]
    },{
        "version": 8,
        "metadata": {
            "mapbox:groups": {
                "group": {
                    "name": "bar"
                }
            }
        },
        "sources": {},
        "layers": [{
            "id": "b",
            "type": "line",
            "metadata": {
                "mapbox:group": "group"
            }
        }]
    }], (errors, warnings, result) => {
        t.false(errors, 'expects no errors');
        t.deepEqual(warnings, [{
            index: 1,
            message: 'Detected duplicate mapbox:groups id "group", renaming as "group1" to avoid conflicts.'
        }], 'expects a mapbox:groups rename warning');

        t.deepEqual(result.metadata, {
            "mapbox:groups": {
                "group": {
                    "name": "foo"
                },
                "group1": {
                    "name": "bar"
                }
            }
        }, 'merged metadata mapbox:groups');

        t.deepEqual(result.layers, [
            {
                "id": "a",
                "type": "line",
                "metadata": {
                    "mapbox:group": "group"
                }
            },
            {
                "id": "b",
                "type": "line",
                "metadata": {
                    "mapbox:group": "group1"
                }
            }
        ], 'merged layers with groups');

        t.end();
    });
});
