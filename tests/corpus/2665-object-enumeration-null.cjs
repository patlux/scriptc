// Object enumeration performs ToObject and throws for both nullish values.
try {
  Object.values(null);
} catch (error) {
  console.log(error.name, error.message);
}
try {
  Object.values(undefined);
} catch (error) {
  console.log(error.name, error.message);
}
