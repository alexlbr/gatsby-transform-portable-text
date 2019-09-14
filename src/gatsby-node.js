const { GraphQLInt, GraphQLString } = require("gatsby/graphql");
const memoize = require("lodash.memoize");

const toPlainText = memoize((blocks = []) =>
  blocks
    // loop through each block
    .map(block => {
      // if it's not a text block with children,
      // return nothing
      if (block._type !== "block" || !block.children) {
        return "";
      }
      // loop through the children spans, and join the
      // text strings
      return block.children.map(child => child.text).join("");
    })
    .join(" ")
    .replace(/\s\s+/g, " ")
);

function readingTime(text, wordsPerMinute = 200) {
  const noOfWords = text.split(/\s/g).length;
  const minutes = noOfWords / wordsPerMinute;

  return Math.ceil(minutes);
}

exports.setFieldsOnGraphQLNodeType = ({ type }, { extendTypes = [] } = {}) => {
  if (extendTypes.find(({ typeName }) => type.name === typeName)) {
    return {
      excerpt: {
        type: GraphQLString,
        args: {
          limit: {
            type: GraphQLInt,
            defaultValue: 100,
            description: `The max number of characters that should be displayed. The excerpt doesn't crop words. If all the characters of a word don't fit the limit then the word is not included.`
          }
        }
      },
      readingTimeInMinutes: {
        type: GraphQLInt,
        args: {
          wordsPerMinute: {
            type: GraphQLInt,
            defaultValue: 200,
            description:
              "The number of words a person can read on average in a minute"
          }
        }
      }
    };
  }

  // by default return empty object
  return {};
};

exports.createResolvers = ({ createResolvers }, { extendTypes } = {}) => {
  const resolvers = {
    ...extendTypes.reduce(
      (accumulatedTypes, { typeName, contentFieldName }) => {
        accumulatedTypes[typeName] = {
          readingTimeInMinutes: {
            resolve: (source, args = {}) => {
              const { wordsPerMinute } = args;
              return readingTime(
                toPlainText(source[contentFieldName]),
                wordsPerMinute
              );
            }
          },
          excerpt: {
            resolve: (source, args = {}) => {
              const { limit } = args;
              const text = toPlainText(source[contentFieldName]);

              return text.length > limit
                ? text.substr(0, text.lastIndexOf(" ", limit)) + "..."
                : text;
            }
          }
        };

        return accumulatedTypes;
      },
      {}
    )
  };
  createResolvers(resolvers);
};
