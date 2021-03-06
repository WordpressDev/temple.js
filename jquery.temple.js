(function() {

//exit where there is no $ (jQuery or Zepto)
if (typeof $ === 'undefined') {
	return;
}

//used for actual templating when the node is a leaf node
$.fn.templeLeaf = function(propValue, propName, currentStash) {

    var typeOfPropValue = typeof propValue,
    	leafNode = this;

    switch(typeOfPropValue) {

		//when value is a primitive (string and number are assumed to be easily
		//convertible to text) just put the value in the node with the default
		//way (depending on the node type)
        case 'string':
        case 'number':
            var htmlContainer = leafNode,
                textContainer = leafNode;
            //because of simple templating sometimes we want to find a node
            //that doesn't have the attribute data-templ, but in that case
            //it should only be used by text templating
            //example: $(node).templeLeaf('some text')
            //html templating must always require data-templ-html on the node
            if (propName) {
                htmlContainer = htmlContainer.filter('[data-templ-html~="'+propName+'"]');
            }
            else {
                htmlContainer = htmlContainer.filter('[data-templ-html]');
            }
			//if we need to use HTML
            if (htmlContainer.length) {
				htmlContainer.empty().html( propValue );
				//newly created stash might complain data-templ
				//attribs, then they might want to attempt
				//to be templated
				currentStash && htmlContainer.children().temple(currentStash);

                //short circuit to avoid doing both html and text
                return leafNode;
            }

			//defaults to text
			//uses value for input types
            if (propName) {
                textContainer = textContainer.filter('[data-templ~="'+propName+'"]');
            }
            textContainer.each(function(i, node) {
            	switch ( node.nodeName ) {

					case 'INPUT':
					case 'TEXTAREA':
						$(node).val( propValue );
					break;

					case 'OPTGROUP':
						$(node).attr( 'label', propValue );
					break;

					default:
						$(node).text( propValue )
					break;
            	}
            });

        break;

        case 'object':
        case 'function':
            if (propValue===null) {
                leafNode.filter('[data-templ~="'+propName+'"]').remove();
            }
            else {
            	var jqPropValue = propValue.value,
            		jqPropAttr = propValue.attr;
            	//if attr name is preceded with a + we need to
            	//append a new value, rather than swap
            	//this is typical when adding classes
            	//but we will make it generic
            	if ( jqPropAttr.charAt(0)=='+' ) {
					jqPropAttr = jqPropAttr.substr(1);
            		jqPropValue = function(i, oldValue) {
            			//jQuery is supposed to pass an oldValue,
            			//but it sometimes fails (in case of a class)
            			if (typeof oldValue=='undefined') {
            				oldValue = leafNode.attr(jqPropAttr)||'';
            			}
            			//problem here is when appending attributes
            			//sometimes you want to add them after a space
            			//and sometimes you just want to append
            			//for now we will just add a space bu default
            			//because there doesn't seem to be any obvious use case
            			//for other scenario
            			return oldValue + ' ' + propValue.value;
            		}

				}

				if ( jqPropAttr.charAt(0)=='-' ) {
					jqPropAttr = jqPropAttr.substr(1);
            		jqPropValue = function(i, oldValue) {
            			//jQuery is supposed to pass an oldValue,
            			//but it sometimes fails (in case of a class)
            			if (typeof oldValue=='undefined') {
            				oldValue = leafNode.attr(jqPropAttr)||'';
            			}
            			return oldValue.replace(propValue.value, '');
            		}
				}

                leafNode
                	.filter('[data-templ~="'+propName+'"]')
                	.attr(jqPropAttr, jqPropValue);

            }
        break;

    }

    return leafNode;

};

//used on a root node, traverses the tree looking for nodes to template
$.fn.temple = function(stash, stencil) {
    var rootNode = this,
        dataSelector = '[data-templ], [data-templ-html]',
        stencil,
        dataNodes = rootNode
            .filter(dataSelector)
            .add( rootNode.find(dataSelector) );

    for (var propName in stash) {

        var stashProp = stash[propName];

        if ( $.isArray(stashProp) ) {

            var $node = dataNodes
                    .filter([
                    '[data-templ~="'+propName+'"]',
                    '[data-templ-html~="'+propName+'"]'
                    ].join(','));

            if ($node.length) {
            	//look for stencil
            	//1. The stencil can be passed as a jQuery compatible argument
            	//make sure we have a jQuery compatible argument to work with
				if (typeof stencil !== 'undefined') {
					if (typeof stencil.jquery == 'undefined') {
						stencil = $(stencil);
					}
				}
				else {
				//2. look for previously cached stencil
					var cachedStencil = $node.data('temple-stencil');
					if (cachedStencil && cachedStencil.length) {
						stencil = cachedStencil
					}
				//3. treat 1st child of the element as a stencil
					else {
						stencil = $node.children().eq(0);
					}
				}

                if (stencil.length) {
                    stencil = stencil.clone();
                    $node.empty();

                    //cache stencil on the node
                    //this might be incompatible with zepto as it doesn't save
                    //object in data
                    $node.data('temple-stencil', stencil.clone());

                    $.each(stashProp, function(index, stashArrayElem) {
                        var $subNode = stencil.clone().show();
                        if (typeof stashArrayElem === 'string') {
                            //we will ignore the key here and just template it
                            //problem is it will not template the node without
                            //the key
                            $subNode.templeLeaf(stashArrayElem)
                        }

                        $subNode.temple(stashArrayElem)
                        $node.append($subNode);
                    });

                }
            }
        }

        else {

            var stashCopy = $.extend({}, stash);

            delete stashCopy[propName];

            dataNodes
                .templeLeaf(stashProp, propName, stashCopy);
        }

    }

    return rootNode;

};

})();
