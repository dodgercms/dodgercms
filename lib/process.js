/**

 */

var dodgercms = dodgercms || {};

dodgercms.process = (function() {
    'use strict';

    //s3 is optionals
    function entry(key, content, bucket, domain, s3) {

        if (typeof s3 === 'undefined') {
            s3 = '';
        }

        async.waterfall([
            // function(callback) {
            //     var params = {
            //         Bucket: bucket, 
            //         Key: key
            //     };

            //     s3.getObject(params, function(err, data) {
            //         if (err) {
            //             callback(err);
            //         } else {
            //             callback(null, data);
            //         }
            //     });
            // },
            function(callback) {
                var options = {
                    renderer: new marked.Renderer(),
                    gfm: true,
                    tables: true,
                    breaks: false,
                    pedantic: false,
                    sanitize: true,
                    smartLists: true,
                    smartypants: true,
                    highlight: function(code) {
                        return highlight.highlightAuto(code).value;
                    }
                };

                marked(content, options, function(err, data) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, data);
                    }
                })
                
            },
            // Process the templates
            function(body, callback) {

                var context = {
                    body: body,
                    bucket: bucket,
                    domain: domain
                };
                //console.log(Handlebars.templates);
                var entry = dodgercms.templates["entry.html"];
                var html = entry(context);
                console.log(html);
                callback(null, html);
            },
            function(html, callback) {
                var metadata = {
                    "Content-Type": "text/html; charset=UTF-8"
                };

                var keyNoExtension = key.substr(0, key.lastIndexOf('.')) || key;

                var params = {
                    Bucket: bucket,
                    Key: keyNoExtension,
                    Body: html,
                    ContentType: "text/html; charset=UTF-8",
                    Expires: 0,
                    CacheControl: "public, max-age=0, no-cache"
                };
                s3.upload(params, function(err, data) {
                    if (err) {
                        callback(err);
                    } else {
                        console.log('upload successful');
                        callback(null);
                    }
                });
            },
            // The navigatio needs to be updated
            function(callback) {
                // get the .menu file

                // get all the objects in the bucket
                var params = {
                    Bucket: bucket,
                    EncodingType: 'url',
                    MaxKeys: 1000,
                };

                s3.listObjects(params, function(err, data) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, data);
                    }
                });


            },

            // takes the files from the s3 bucket
            function(data, callback) {

                var contents = data.Contents;
                var keys = [];

                // get each object in parallel
                async.each(contents, function(object, cb) {
                  // Perform operation on file here.
                    s3.headObject({
                        Bucket: bucket, 
                        Key: object.Key
                    }, function(err, data) {
                        if (err) {
                            cb(err);
                        } else {
                            // add the Key attribute
                            data.Key = object.Key
                            keys.push(data);
                            cb(null);
                        }
                    });

                }, function(err) {
                    // if any of the file processing produced an error
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, keys);
                    }
                });



            },

            // takes an array of keys and builds a tree
            // ["key-name"]: {data}
            function(keys, callback) {
                var tree = [];


                function buildFromSegments(scope, pathSegments) {
                    // Remove the first segment from the path
                    var current = pathSegments.shift();

                    // See if that segment already exists in the current scope
                    var found = findInScope(scope, current);

                    // If we did not find a match, create the new object for this path segment
                    if (!found) {
                        scope.push(found = {
                            label: current,
                            children: false
                        });
                    }

                    // If there are still path segments left, we need to create
                    // a children array (if we haven't already) and recurse further
                    if (pathSegments.length) {
                        found.children = found.children || [];
                        buildFromSegments(found.children, pathSegments);
                    }
                }

                // Attempts to find a path segment in the current scope
                function findInScope(scope, find) {
                    for (var i = 0; i < scope.length; i++) {
                        if (scope[i].label === find) {
                            return scope[i];
                        }
                    }
                }

                keys.forEach(function(data) {
                    var key = data.Key;

                    // if it ends with a slash its a directory
                    //var isDir = (key.substr(-1) === '/') ? true : false;
                    // remove the last slash if is exists so there is no empty string in the split array
                    var parts = data.Key.replace(/\/\s*$/, "").split('/');

                    buildFromSegments(tree, parts);
                });


                console.log(JSON.stringify(tree, null, 4));


                var context = {
                    nav: tree,
                    bucket: bucket,
                    domain: domain
                };

                //var menu = dodgercms["templates/menu.html"];
                var nav = dodgercms.templates["nav.html"];

                console.log(dodgercms);
                console.log(Handlebars.partials);

                var html = nav(context);
                console.log(html);
                callback(null, html);
            },

            // upload the nav to the bucket
            function(nav, callback) {
                var metadata = {
                    "Content-Type": "text/html"
                };

                var params = {
                    Bucket: bucket,
                    Key: ".dodgercms/nav.html",
                    Body: nav,
                    ContentType: "text/html; charset=UTF-8",
                    Expires: 0,
                    CacheControl: "public, max-age=0, no-cache"
                };
                s3.upload(params, function(err, data) {
                    if (err) {
                        callback(err);
                    } else {
                        console.log('upload successful');
                        callback(null);
                    }
                });
            }
        ], function(err, result) {
            if (err) {
                
            } else {
                
            } 
        });
    }

    function menu() {

    }

    return {
        entry: entry,
        menu: menu
    };
}());