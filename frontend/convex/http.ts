import { httpRouter } from "convex/server";
import { getEmbeddings, postUploadPerson } from "./images";

const http = httpRouter();

http.route({
  path: "/getEmbeddings",
  method: "GET",
  handler: getEmbeddings,
});

http.route({
  path: "/upload",
  method: "POST",
  handler: postUploadPerson
})

// http.route({
//   path: "/getPersons",
//   method: "GET",
//   handler: getPersons,
// })


export default http;  