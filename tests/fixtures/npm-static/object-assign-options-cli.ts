import { buildRequestOptions } from "object-assign-options-static";

const options = buildRequestOptions();
console.log(options.model, options.enabled, options.retries, options.headers.authorization);
