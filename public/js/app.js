window.addEventListener('load', function() {
  var webAuth = new auth0.WebAuth({
    clientID: AUTH0_CLIENT_ID, 
    domain: AUTH0_DOMAIN,
    scope: 'openid profile email',
    responseType: 'token',
    redirectUri: AUTH0_CALLBACK_URL
  });

  document.getElementById('btn-login').addEventListener('click', function() {
    webAuth.authorize();
  });

  document.getElementById('btn-logout').addEventListener('click', function() {
    logout();
  });

  webAuth.parseHash({ hash: window.location.hash }, (err, authResult) => {
    if (err) {
      return console.error(err);
    }
    if (authResult) {
      webAuth.client.userInfo(authResult.accessToken, (err, profile) => {
        if (err) {
          // Remove expired token (if any)
          localStorage.removeItem('token');
          // Remove expired profile (if any)
          localStorage.removeItem('profile');
          console.log("remove items");
          return alert('There was an error getting the profile: ' + err.message);
        } else {
          localStorage.setItem('token', authResult.accessToken);
          localStorage.setItem('profile', JSON.stringify(profile));
          console.log("show tokens/profile");
          showUserProfile(profile);
        }
        window.location.hash = "";
      });
    }
  });

  var checkAuth = function() {
    var token = localStorage.getItem('token');
    if (token) {
      var user_profile = JSON.parse(localStorage.getItem('profile'));
      showUserProfile(user_profile);
    } // else: not authorized
  };

  var showUserProfile = function(profile) {
    console.log("Full Contact details", profile.user_metadata.fullcontact);
  };

  var logout = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('profile');
    window.location.href = "/";
    console.log("logout prompt");
  };

  checkAuth();
});
/**
 * Starts the authentication flow
 */
const login = async (targetUrl) => {
  try {
    console.log("Logging in", targetUrl);

    const options = {
      redirect_uri: window.location.origin
    };

    if (targetUrl) {
      options.appState = { targetUrl };
    }

    await auth0.loginWithRedirect(options);

  } catch (err) {
    console.log("Log in failed", err);
  }
};

/**
 * Executes the logout flow
 */
const logout = () => {
  try {
    console.log("Logging out");
    auth0.logout({
      returnTo: window.location.origin
    });
  } catch (err) {
    console.log("Log out failed", err);
  }
  localStorage.removeItem('token');
  localStorage.removeItem('profile');
  window.location.href = "/";
};

/**
 * Retrieves the auth configuration from the server
 */
const fetchAuthConfig = () => fetch("/auth_config.json");

/**
 * Initializes the Auth0 client
 */
const configureClient = async () => {
  const response = await fetchAuthConfig();
  const config = await response.json();

  auth0 = await createAuth0Client({
    domain: config.domain,
    client_id: config.clientId,
    audience: config.audience
  });
};


/**
 * Checks to see if the user is authenticated. If so, `fn` is executed. Otherwise, the user
 * is prompted to log in
 * @param {*} fn The function to execute if the user is logged in
 */
const requireAuth = async (fn, targetUrl) => {
  const isAuthenticated = await auth0.isAuthenticated();

  if (isAuthenticated) {
    return fn();
  }

  return login(targetUrl);
};

// Will run when page finishes loading
window.onload = async () => {
  await configureClient();

  // If unable to parse the history hash, default to the root URL
  if (!showContentFromUrl(window.location.pathname)) {
    showContentFromUrl("/");
    window.history.replaceState({ url: "/" }, {}, "/");
  }

  const bodyElement = document.getElementsByTagName("body")[0];

  // Listen out for clicks on any hyperlink that navigates to a #/ URL
  bodyElement.addEventListener("click", (e) => {
    if (isRouteLink(e.target)) {
      const url = e.target.getAttribute("href");

      if (showContentFromUrl(url)) {
        e.preventDefault();
        window.history.pushState({ url }, {}, url);
      }
    }
  });

  const isAuthenticated = await auth0.isAuthenticated();

  if (isAuthenticated) {
    console.log("> User is authenticated");
    window.history.replaceState({}, document.title, window.location.pathname);
    updateUI();
    return;
  }
  else {

  console.log("> User not authenticated");
  }

  const query = window.location.search;
  const shouldParseResult = query.includes("code=") && query.includes("state=");

  if (shouldParseResult) {
    console.log("> Parsing redirect");
    try {
      const result = await auth0.handleRedirectCallback();

      if (result.appState && result.appState.targetUrl) {
        showContentFromUrl(result.appState.targetUrl);
      }

      console.log("Logged in!");
    } catch (err) {
      console.log("Error parsing redirect:", err);
    }

    window.history.replaceState({}, document.title, "/");
  }

  


  updateUI();
};
