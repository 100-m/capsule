const tables = {
  bond: {
    "country": "FR",
    "currency": "EUR",
    "id": 8,
    "maturity_date": "2027-01-01T00:00:00+00:00",
    "name": "GGL-2027-2.3%",
    "resolution_date": "2021-12-16T19:18:33.60704+00:00",
    "resolution_status": "approved",
    "resolution_user_id": 2,
    "source": "manual",
    "uid": "FR-439903446",
    "update_date": "2021-12-16T09:18:33.60704+00:00",
    "update_user_id": 1
  },
  coupon: {
    "bond_id": 8,
    "coupon": 0.023,
    "currency": "USD",
    "date": "2022-01-01T00:00:00+00:00",
    "id": 1
  },
  instrument: {
    "country": "FR",
    "currency": "EUR",
    "id": 1,
    "name": "AF-PRIVATE-DEBT",
    "resolution_date": null,
    "resolution_status": null,
    "resolution_user_id": null,
    "source": "manual",
    "uid": "FR-018066960",
    "update_date": "2021-12-16T09:18:33.60704+00:00",
    "update_user_id": 1
  },
  equity: {
    "country": "FR",
    "currency": "EUR",
    "id": 2,
    "issuer": "BNP",
    "name": "EPA:BNP",
    "resolution_date": "2021-12-18T09:18:33.60704+00:00",
    "resolution_status": "rejected",
    "resolution_user_id": 2,
    "share_number": 730372026,
    "source": "manual",
    "uid": "FR-297920657",
    "update_date": "2021-12-16T09:18:33.60704+00:00",
    "update_user_id": 1
  },
  preferred: {
    "country": "US",
    "currency": "USD",
    "id": 3,
    "issuer": "TESLA",
    "name": "NASDAQ:TSLA",
    "rate": 0.07,
    "resolution_date": null,
    "resolution_status": null,
    "resolution_user_id": null,
    "share_number": 194491300,
    "source": "manual",
    "uid": "FR-320404407",
    "update_date": "2021-12-16T09:18:33.60704+00:00",
    "update_user_id": 1
  },
}
tables.golden = tables.candidates = tables.instrument

/**
 * Accepts a bunch of information about a Scalar, and allows you to return an example
 * to be used in your documentation. If undefined is returned, a default example will
 * be used for you.
 *
 * @param  {Object} argz An object containing the following properties to help you generate your example:
 *
 *    {String} name - The name of this Scalar
 *    {Object} definition - The JSON Schema definition for this Scalar
 *
 *    {Object} args - All of the arguments originally passed to the augmentation method:
 *      {Object} introspectionResponse - The introspection query response Object
 *      {Object} jsonSchema - The JSON Schema representing the entire GraphQL Schema
 *      {Object} graphQLSchema - The GraphQL schema object
 *      {introspectionOptions} - Options from the CLI and YML related to generating the documentation
 *
 * @return {Any} The value to use as an example. Return undefined to just use the default.
 */
function scalarProcessor (argz = {}) {
  const {
    name,
    definition,
  } = argz

  // return name
}

/**
 * Accepts a bunch of information about a Field, and allows you to return an example
 * to be used in your documentation. If undefined is returned, a default example will
 * be used for you.
 *
 * @param  {Object} argz An object containing the following properties to help you generate your example:
 *    {String} parentName - The name of the Type this Field is part of
 *
 *    {String} name - The name of this Field
 *    {String} returnType - The singular, when-non-null return Type of the Field (e.g. `[Foo!]!` would be `Foo` here)
 *    {Object} definition - The JSON Schema definition for this Field
 *
 *    {Boolean} isArray - Boolean indicating if the return Type is an array/list
 *    {Boolean} itemsRequired - Boolean indicating if the items in the array/list are required
 *
 *    {Object} args - All of the arguments originally passed to the augmentation method:
 *      {Object} introspectionResponse - The introspection query response Object
 *      {Object} jsonSchema - The JSON Schema representing the entire GraphQL Schema
 *      {Object} graphQLSchema - The GraphQL schema object
 *      {introspectionOptions} - Options from the CLI and YML related to generating the documentation
 *
 * @return {Any} The value to use as an example. Return undefined to just use the default.
 */
function fieldProcessor (argz = {}) {
  const {
    parentName,
    name,
    returnType,
    definition,
    isArray,
  } = argz

  // const x = ['field', parentName, name, returnType].join('-')
  const x = tables?.[parentName]?.[name]
  if (x !== undefined) return isArray ? [x] : x
}

/**
 * Accepts a bunch of information about an Argument, and allows you to return an example
 * to be used in your documentation. If undefined is returned, a default example will
 * be used for you.
 *
 * @param  {Object} argz - An object containing the following properties to help you generate your example:
 *    {Enum of String} grandParentType - If the Argument is on a Field, this will be "Type". Otherise,
 *      the Argument is from a Query or Mutation and it will indicate "Query" or "Mutation".
 *    {String} grandParentName - If the Argument is on a Field, this will list the name of the Type that
 *      the Field is part of. Otherise, the Argument is from a Query or Mutation and it will indicate
 *      "Query" or "Mutation".
 *
 *    {Enum of String} parentType - If the Argument is on a Field, this will be "Field". Otherise,
 *      the Argument is from a Query or Mutation and it will indicate "Query" or "Mutation".
 *    {String} parentName - The name of the Field, Query or Mutation this Argument is on.
 *    {Object} parentDefinition - The JSON Schema definition for the parent of this Argument
 *
 *    {String} name - The name of this Argument
 *    {Object} definition - The JSON Schema definition for this Argument
 *    {String} type - The singular, when-non-null return Type of this Argument (e.g. `[Foo!]!` would be `Foo` here)
 *
 *    {Boolean} isArray - Boolean indicating if the return Type is an array/list
 *    {Boolean} itemsRequired - Boolean indicating if the items in the array/list are required
 *    {Object} args - All of the arguments originally passed to the augmentation method:
 *      {Object} introspectionResponse - The introspection query response Object
 *      {Object} jsonSchema - The JSON Schema representing the entire GraphQL Schema
 *      {Object} graphQLSchema - The GraphQL schema object
 *      {introspectionOptions} - Options from the CLI and YML related to generating the documentation
 *
 * @return {Any} The value to use as an example. Return undefined to just use the default.
 */
function argumentProcessor (argz = {}) {
  const {
    definition,
    parentType,
    parentName,
    name,
    type,
    isArray,
  } = argz

  // const x = ['arg', parentName, parentType, name, type].join('-')
  // return isArray ? [x] : x
}

module.exports = {
  fieldProcessor,
  argumentProcessor,
  scalarProcessor,
}
