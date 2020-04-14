/**
 * Name: Paridhi Khaitan
 * School: University of California, San Diego
 * Position: FullStack Internship
 * Description: A program that randomly sends users to one of two websites
 * Notes: It was really interesting to use Cloudflare's APIs. They are super powerful
 * specially the HTML Rewriter one, and I'll continue using it even after the project
 */

//The base url that fetches both the variants
const API_URL = "https://cfw-takehome.developers.workers.dev/api/variants";

//Stores the variant array, and makes it globally available for other functions to use
let variantsArray;

/**
 * Computes the random number (which determines the group that a user is put in)
 * and make it globally accessible for other functions to use
 */
let randomNumber;

addEventListener("fetch", event => {
  event.request = API_URL;
  event.respondWith(handleRequest(event.request));
});

/**
 * Respond with hello worker text
 * @param {Request} request
 */
async function handleRequest(request) {
  //Initialises HTMLRewriter on the components specified in the README
  let rewriter = new HTMLRewriter()
    .on("title", new ElementHandler())
    .on("h1#title", new ElementHandler())
    .on("p#description", new ElementHandler())
    .on("a#url", new AttributeRewriter("href"));

  /**
   * Fetches the base API, parses the response to JSON and stores the variant array
   * Catches if an error occurs
   */
  await fetch(API_URL)
    .then(response => {
      return response.json();
    })
    .then(response => {
      variantsArray = response.variants;
    })
    .catch(error => console.log("Unable to fetch: ", error));

  /**
   * Response returned by the cookie check function is the one that will be displayed
   */
  let response = await cookieCheck(request);

  return rewriter.transform(response);
}

/**
 * An async function that checks if cookies have been established for this site.
 * If they have, it means a user has visited before, and the url that they
 * visited will persist
 * @param {Request} request
 */
async function cookieCheck(request) {
  //Checks cookies to see what's going on
  const USER_GROUP = "user-group";
  const GROUP_ONE_RES = await fetch(variantsArray[0]);
  const GROUP_TWO_RES = await fetch(variantsArray[1]);

  const cookie = request.headers.get("cookie");

  //If the cookies are set and the user belongs to GROUP ONE
  if (cookie && cookie.includes(`${USER_GROUP}=group_one`)) {
    randomNumber = 0;
    return GROUP_ONE_RES;
  }
  //If the cookies are set and the user belongs to GROUP TWO
  else if (cookie && cookie.includes(`${USER_GROUP}=group_two`)) {
    randomNumber = 1;
    return GROUP_TWO_RES;
  }
  //If a user is visiting for the first time, determine group and store cookies
  else {
    //Computes a random number (either 1 or 0) to determine the user group
    randomNumber = Math.floor((Math.random() * 100) % 2);

    //Gets the specific variant URL
    let response = await fetch(variantsArray[randomNumber]);

    //Copies over the response to make the headers mutiable
    //Source : https://developers.cloudflare.com/workers/templates/pages/alter_headers/
    response = new Response(response.body, response);

    //Assigns the user to a group and sets the cookies for the user,
    //They'll always return to this variant
    let group = randomNumber === 0 ? "group_one" : "group_two";
    response.headers.append("Set-Cookie", `${USER_GROUP}=${group}; path=/`);
    return response;
  }
}

/* From HTML Rewritter: Changes the inner content of the specified elements */
class ElementHandler {
  element(element) {
    //Changes the main title tag, keeps it consistent across both versions
    if (element.tagName === "title") {
      element.setInnerContent("Paridhi's Take-Home");
    }

    //Changes the h1#title tag for different users
    if (element.tagName === "h1") {
      if (randomNumber === 0) {
        element.setInnerContent("I'm Paridhi, Student @UCSD");
      } else {
        element.setInnerContent("I'm Paridhi, an advocate for diversity");
      }
    }

    //Changes the p#description for different users
    if (element.tagName === "p") {
      if (randomNumber === 0) {
        element.setInnerContent(
          "I'm really passionate about the intersection of Computer Science and Design and want to better the world one line of code at a time."
        );
      } else {
        element.setInnerContent(
          "I work with WIC (Women in Computing), ABLE (Anita B. Org Leadership) and GWC (Girls' Who Code) to promote representation in CS."
        );
      }
    }
  }
}

/* To make changes to the attribute, in this case sending users who click on the button to my portfolio */
class AttributeRewriter {
  //Stores the attribute name
  constructor(attributeName) {
    this.attributeName = attributeName;
  }

  //Gets the href attribute of the a element. Changes it from that of cloudflare to my portfolio website
  element(element) {
    const attribute = element.getAttribute(this.attributeName);
    if (attribute) {
      element.setInnerContent("Visit My Website :)");
      element.setAttribute(
        this.attributeName,
        attribute.replace(
          "https://cloudflare.com",
          "https://www.paridhikhaitan.me"
        )
      );
    }
  }
}
