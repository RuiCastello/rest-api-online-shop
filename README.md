
# REST API for an online shop 
## Using Node.js, Express, and Mongoose

<br />

[DEMO](https://rest-api-online-shop.herokuapp.com/)  

- Credentials:
```
Admin Account
username: admin
email: admin@api.pt
password 1234567

Normal Account
username: user
email: user@api.pt
password: 1234567

Customer Service account
username: cs
email: user@api.pt
password: 1234567
```

API example for a generic online shop made with Node.js, Mongoose, Express, and a few other complementary packages.

<br />

# Getting Started

You'll need a few things first. 
Please have a look at the process described below to make sure you install every resource that's needed and execute the app correctly.

### **Software requirements:**

[NPM](https://www.npmjs.com/), [Node.js](https://nodejs.org/en/), access to a [MongoDB](https://www.mongodb.com/) database, and any software that can access the different methods on a REST API ([Postman](https://www.postman.com/) recommended).

<br />
<br />

# Installation

Once you've made sure you have all the software requirements, here's how to install and run this app:

1 - Clone the repository. In your terminal type:
```
git clone https://github.com/RuiCastello/rest-api-online-shop.git
```

<br />

1.1 - Enter the directory of the project, example (on windows):
```
cd rest-api-online-shop
```

<br />

2 - Install all the necessary node packages with NPM, on your terminal of choice:

```
npm install
```

<br />

3 - **Rename the .ENV.EXAMPLE file to .ENV**, and edit the .ENV file to enter your desired values for:

```
HTTP_PORT
DATABASE
SECRET
EMAIL_USERNAME (only change this if you have a SendGrid API access key)
EMAIL_PASSWORD (only change this if you have a SendGrid API access key)
EMAIL_SENDER (only change this if you have a SendGrid API access key)
```
<br />

4 - Before running the app, let's fill the new database with some data, just make sure the database doesn't exist yet, or the process might fail. Type in your terminal:
```
npm run importdata
```
<br />

4.1 - If you encounter any problems on step 4, please make sure that you ran step 3 correctly and that you don't have a collection on your mongoDB database with the same name as described in the .env file. 

<br />


5 - After the import is complete, to run the app, type in your terminal:
```
npm start
```

<br />

Once the app has been installed, feel free to use the endpoints below.

If you didn't change the port in the .env file, the url of your new REST API server should be: http://localhost:9001

<br />

You can login with the following credentials, but the **admin** account is the recommended one as it has access to all the endpoints:
```
Admin Account
username: admin
email: admin@api.pt
password 1234567

Normal Account
username: user
email: user@api.pt
password: 1234567

Customer Service account
username: cs
email: user@api.pt
password: 1234567
```

Please note:

-  It's **recommended to change the email address of one of these accounts to your own email address** if you intend to fully test this app, as the password reset functionality will only work by sending you an automated email with a reset token.

-  To change the email address of any account, log into the account and use the method PUT on the path "/me" and pass the key "email" onto the body with the value corresponding to your email address.

<br />
<br />

# Important Notes

>**Most features of this API require the user to be logged in**.
>
>Please make sure you **always pass the token** you receive after logging in (or after registering) as a **header value with a key named "x-token"**.
>
> To fully use this API, **please make sure to follow the installation steps carefully and import the data that's already been prepared so that you'll be able to login with an account with "Admin" access.**

>If you'd like to create all the data yourself instead of importing it, you can. But please understand that for changing the "role" value of a newly created user you'll need to directly change it in the database, as any new user is created by default without any administration privileges, and only another admin user can change that. 

<br />
<br />

# Endpoints:

<br />

## Authentication
---

<br />

> ## /register

- **POST** - Creates a new user with a few provided values that can be found in the table below 

Method: POST
| Key | Requirements |
| ----------- | ----------- |
| **name** | Required; Min 2-chars | 
| **username** | Required; Min 2-chars; Unique |
| **email** | Required; Valid email format, Unique |
| **password** | Required; Min 7-chars |
| **password2** | Required; Confirmation password - Needs to match password |

<br />

---

<br />

> ## /login

- **POST** - Logs the user in. The only requirements are a password and either a username or an email. Returns a token to be used as a value in future requests as "x-token" key via the headers. 

Method: POST
| Key | Information |
| ----------- | ----------- |
| **username** | Semi-Optional - Not required if email is provided |
| **email** | Semi-Optional - Not required if username is provided |
| **password** | Required |

<br />

---

<br />

> ## /me
> 
- **GET** - Displays the user's data
  
- **PUT** - Edits the user's data

- **DELETE** - Deletes the user from the DB

Methods: GET, PUT, DELETE
| Key | Method | Requirements |
| ----------- | ----------- |----------- |
| **name** | PUT | Min 2-chars |
| **username** | PUT | Min 2-chars; Unique |
| **email** | PUT | Valid email format, Unique |
| **password** | PUT | Min 7-chars |
| **password2** | PUT | Confirmation password - Needs to match password |
| **currentPassword** | PUT | Current password; Required if changing password |

<br />

---

<br />

> ## /forgotPassword

Notes:

- Only one of the fields is required, either username or email.

- **POST** - Sends a request to change password, requires an email or a username as input and if sucessful, the user receives an email with a link to change their password.

Methods: POST
| Key | Information |
| ----------- | ----------- |
| **username** | Your username as it exists in the database |
| **email** | Your email as it exists in the database |

<br />

---

<br />

> ## /resetPassword/(emailToken)
- **POST** - Changes the users password to the new one being sent in the body

Method: POST
| Key | Information |
| ----------- | ----------- |
| **emailToken** | Passed in as part of the URL right after "resetPassword/" - The token you have received in your email address after submiting a forgot password request |
| **password** | Min 7-chars |
| **password2** | Confirmation password - Needs to match password |


<br />

---
---

<br />
<br />

## Products
---

<br />

> ## /products
Note: 
- **POST** - creates a new product and requires user role to be either CS or ADMIN

- **GET** - Retrieves the information about all products and can be made into an advanced query with the parameters you can find in the table below

Methods: GET, POST
| Key | Method | Requirements |
| ----------- | ----------- |----------- |
| **price** | POST | Required; Can't be zero or negative |
| **name** | POST | Required; Unique; Min 2-chars |
| **description** | POST | Required; Min 10-chars |
| **category** | POST | id of an existing Category |
| **subcategory** | POST | id of an existing Sub-category |
| **search** | GET | Query-param; Searches the database with partial or full matches against the name and description |
| **sort** | GET | Query-param; Sort the list of products by field name; + for Ascending order, - for Descending |
| **limit** | GET | Query-param; Limit the number of items you want to receive per page |
| **page** | GET | Query-param; Get the respective results page number |
| **image** | POST | To be sent as part of Form-data type of encoding; Needs to be an image |

Usage Examples: 

> Search - /products?search=robot
> 
> Sort - /products/?sort=-feedback,+name (products sorted by feedback in descending order and name in ascending order)
> 
> Limit - /products/?limit=5 (limit results to 5 products per page)
> 
> Page - /products/?page=2 (Get second page of results )
>
> Limit + Page - /products/?limit=5&page=2 (Limit results per page at 5 products, and get second page of results )
> 
> Filter - /products?price[gte]=50 (products which price is higher or equal to 50 euros)
> 
> Filter - /products?price[lt]=50 (products which price is less than 50 euros)
> 
> Filter - /products?price=50 (products which price is exactly 50 euros)
> 
> Filter - /products/?sort=+feedback,name&limit=30&page=1
>
> All filters compounded - /products/?search=robot&price[lte]=50000&sort=+feedback,name&limit=30&page=1

<br />

---

<br />

> ## /products/(productId)
>
> ## /products/(slug)

Note: 
- Methods **PUT** and **DELETE** - Require user role to be CS or ADMIN

- **GET** - Displays info about a specific product

- **PUT** - Edits the respective product's data

- **DELETE** - Deletes the respective product

Methods: GET, PUT, DELETE
| Key | Method | Information |
| ----------- | ----------- |----------- |
| **productId** | GET, PUT, DELETE | Passed in as part of the URL with the id of the respective product |
| **slug** | GET, PUT, DELETE | Passed in as part of the URL with the automatically defined slug of the respective product |
| **price** | PUT | Can't be zero or negative |
| **name** | PUT | Min 2-chars; Unique |
| **description** | PUT | Min 10-chars |
| **category** | PUT | id of an existing Category |
| **subcategory** | PUT | id of an existing Sub-category |
| **deleteImage** | PUT | Number from 0 to 9, corresponding to the position of the image you want to remove from the array |
| **image** | PUT | To be sent as part of Form-data type of encoding; Needs to be an image |

<br />

---

<br />

> ## /products/name/(slug)
> 
Notes: 
- **GET** - Displays the products data with a provided slug in the url (it's just an alternative route to the above ones but just displays data).

Methods: GET
| Key | Method | Information |
| ----------- | ----------- |----------- |
| **slug** | GET | Passed in as part of the URL with the automatically defined slug of the respective product |

<br />

---

<br />

> ## /products/(productId)/cart
>
> ## /products/(slug)/cart

Notes: 
- All methods require users to be authenticated

- **POST** - Puts the respective product into the user's cart

- **PUT** - Allows the user to edit the quantity of the product in their cart, and/or to remove it by ommiting quantity or setting it to 0.

- **DELETE** - Removes the product from the user's cart

Methods: POST, PUT, DELETE
| Key | Method | Information |
| ----------- | ----------- |----------- |
| **productId** | GET, PUT, DELETE | Passed in as part of the URL with the id of the respective product |
| **slug** | GET, PUT, DELETE | Passed in as part of the URL with the automatically defined slug of the respective product |
| **quantity** | POST, PUT | Needs to be a number higher than zero |

<br />

---
---

<br />
<br />

## Product Statistics
---


<br />

> ## /products/stats

Notes: 
- **GET** - Displays multiple statistics about ALL products.

Methods: GET

<br />

---

<br />

> ## /products/(productId)/stats
>
> ## /products/(slug)/stats

Notes: 
- **GET** - Displays multiple statistics about a given product

Methods: GET
| Key | Method | Information |
| ----------- | ----------- |----------- |
| **productId** | GET | Passed in as part of the URL with the id of the respective product |

<br />


---
---

<br />
<br />


## Users
---

<br />

> ## /users
Notes: 

- This section requires user role to be "ADMIN"

- **GET** - Displays the list of all users

- **POST** - Creates a new user

- Please note that values for role need to be in upper case.

Methods: GET, POST
| Key | Method | Requirements |
| ----------- | ----------- |----------- |
| **name** | POST | Min 2-chars |
| **username** | POST | Min 2-chars; Unique |
| **email** | POST | Valid email format, Unique |
| **password** | POST | Min 7-chars |
| **password2** | POST | Confirmation password - Needs to match password |
| **role** | POST | Needs to be one of these values: "ADMIN", "CS", or "NORMAL", values need to be in uppercase |

<br />

---

<br />

> ## /users/(userId)
Notes: 

- This section requires user role to be "ADMIN"

- **GET** - Displays info about a specific user

- **PUT** - Edits the respective user's data

- **DELETE** - Deletes the respective user

- Please note that values for role need to be in upper case.

Methods: GET, PUT, DELETE
| Key | Method | Requirements |
| ----------- | ----------- |----------- |
| **userId** | GET, PUT, DELETE | To be passed in the URL, as the _id field of a user |
| **name** | PUT | Min 2-chars |
| **username** | PUT | Min 2-chars; Unique |
| **email** | PUT | Valid email format, Unique |
| **password** | PUT | Min 7-chars |
| **password2** | PUT | Confirmation password - Needs to match password |
| **role** | PUT | Needs to be one of these values: "ADMIN", "CS", or "NORMAL", values need to be in uppercase |

<br />


---
---

<br />
<br />


## Purchases

---

<br />

> ## /purchases
Notes: 

- This section requires user to be authenticated

- Displays the list of the own user's purchases

Method: **GET**

<br />

---

<br />

> ## /purchases/(purchaseId)
Notes: 

- This section requires user to be authenticated

- **GET** - Displays the selected purchase's data

- **DELETE** - Deletes the selected purchase in case it hasn't been paid yet. (Paid purchases can't be deleted in order to keep historical transaction records.)

Methods: GET, DELETE
| Key | Method | Requirements |
| ----------- | ----------- |----------- |
| **purchaseId** | GET, DELETE | To be passed as part of the URL; The _id field of a specific purchase |

<br />

---

<br />

> ## /purchases/(purchaseId)/payment
Notes: 

- This section requires user to be authenticated

- **GET** - Display's the purchase with an extra calculation for the total cost of the last unpaid cart

- **POST** - Issues a request to pay the selected cart as long as it hasn't been paid yet

Methods: GET, POST

| Key | Method | Requirements |
| ----------- | ----------- |----------- |
| **purchaseId** | GET, POST | To be passed as part of the URL; The _id field of a specific purchase |



<br />


---
---

<br />
<br />

## Feedback


---

<br />

> ## /products/(productId)/feedback
Notes: 

- All methods except GET require users to be authenticated

- **GET** - Displays the list of feedback belonging to a given product

- **POST** - Adds a new feedback entry to the chosen product (the rating goes from 1-10, 10 being the highest rating); 
  - Only users who have already bought the selected product, are able to insert feedback about the product. (Buying a product means putting the product in the cart, and pay for the cart) 

- **PUT** - Edits the user's feedback on the selected product (no feedbackId is necessary in this route)

- **DELETE** - Deletes the user's feedback on the selected product (no feedbackId is necessary in this route)

Methods: GET, POST, DELETE, PUT
| Key | Method | Requirements |
| ----------- | ----------- |----------- |
| **productId** | GET, POST, DELETE, PUT | To be passed in the URL with the _id value of a specific product |
| **rating** | POST, PUT | Number from 1 to 10; Required |
| **review** | POST, PUT | Minimum length of 15 characters |

<br />

---

<br />

> ## /products/(productId)/feedback/(feedbackId)
Notes: 

- All methods except GET require users to be authenticated

- **GET** - Displays the selected feedback data

- **PUT** - Edits the selected feedback data

- **DELETE** - Deletes the selected feedback (users with cs or admin privileges are able to delete any feedback)

Methods: GET, PUT, DELETE
| Key | Method | Requirements |
| ----------- | ----------- |----------- |
| **productId** | GET, PUT, DELETE | To be passed in the URL with the _id value of a specific product |
| **feedbackId** | GET, PUT, DELETE | To be passed in the URL with the _id value of a specific feedback |
| **rating** | PUT | Number from 1 to 10 |
| **review** | PUT | Minimum length of 15 characters |

<br />

---
---

<br />
<br />

## Comments
---

<br />

> ## /products/(productId)/comments
Notes: 

- All methods except GET require users to be authenticated

- **GET** - Displays the list of comments belonging to a given product

- **POST** - Adds a new comment entry to the chosen product

- **PUT** - Edits the user's comment on the selected product (no commentId necessary in this route)

- **DELETE** - Deletes the user's comment on the selected product (no commentId necessary in this route)

Methods: GET, POST, PUT
| Key | Method | Requirements |
| ----------- | ----------- |----------- |
| **productId** | GET, POST, PUT, DELETE | To be passed in the URL with the _id value of a specific product |
| **comment** | POST, PUT | Required; Minimum length of 15 characters |

<br />

---

<br />

> ## /products/(productId)/comments/(commentId)
Notes: 

- All methods except GET require users to be authenticated

- **GET** - Displays the selected comment data

- **PUT** - Edits the selected comment data

- **DELETE** - Deletes the selected comment (users with cs or admin privileges are able to delete any comment)

Methods: GET, PUT, DELETE
| Key | Method | Requirements |
| ----------- | ----------- |----------- |
| **productId** | GET, PUT, DELETE | To be passed in the URL with the _id value of a specific product |
| **commentId** | GET, PUT, DELETE | To be passed in the URL with the _id value of a specific comment |
| **comment** | PUT | Minimum length of 15 characters |

<br />


---
---

<br />
<br />

## Wishlist
---

<br />

> ## /products/(productId)/wishlist
Notes: 

- This section requires users to be authenticated

- **PUT** - Adds or removes a specified product from the user's wishlist (it's a toggle action, it adds the product if it's not in the wishlist, and it removes the product if it's already in the wishlist)

Method: PUT
| Key | Method | Requirements |
| ----------- | ----------- |----------- |
| **productId** | PUT | To be passed in the URL with the _id value of a specific product |

<br />

---
---

<br />
<br />

## Categories
---

<br />

> ## /categories
Notes: 

- This section requires users to have the role of CS or ADMIN, except on method GET

- **GET** - Displays the list of all the main product categories

- **POST** - Adds a new main product category

Methods: GET, POST
| Key | Method | Requirements |
| ----------- | ----------- |----------- |
| **name** | POST | Required; Minimum length of 2 characters; Unique |

<br />

---

<br />

> ## /categories/(categoryId)
Notes: 

- This section requires users to have the role of CS or ADMIN, except on method GET

- **GET** - Displays the data of que requested main product category or Sub-category

- **PUT** - Allows the user to edit the name of the main category or Sub-category

- **DELETE** - Deletes the respective main category (Note: you can only delete a main category if there aren't any subcategories associated with it, to delete a main category, first delete all its subcategories if there are any.)

- **POST** - Adds a Sub-category, where the parent category will be the respective main product category passed in the URL

Methods: GET, POST, PUT, DELETE
| Key | Method | Requirements |
| ----------- | ----------- |----------- |
| **categoryId** | GET, POST, PUT, DELETE | To be passed in the URL with the value if the _id field of the selected main category; Required |
| **name** | POST, PUT | Required; Minimum length of 2 characters; Unique |

<br />

---

<br />

> ## /categories/(categoryId)/(subCategoryId)
Notes: 

- This section requires users to have the role of CS or ADMIN, except on method GET

- **GET** - Displays the data of que requested product Sub-category

- **PUT** - Allows the user to edit the name of the Sub-category

- **DELETE** - Deletes the respective Sub-category

Methods: GET, PUT, DELETE
| Key | Method | Requirements |
| ----------- | ----------- |----------- |
| **categoryId** | GET, PUT, DELETE | To be passed in the URL with the value if the _id field of the selected main category; Required |
| **subCategoryId** | GET, PUT, DELETE | To be passed in the URL with the value if the _id field of the selected Sub-category; Required |
| **name** | PUT | Required; Minimum length of 2 characters; Unique |


<br />

---
---

<br />
<br />

# Development Notes

<br />

- This app has been created with a couple of goals in mind:
  - Develop a robust API for an online shop
  - Expand and improve my coding skills and knowledge.

  This means that throughout the app you will notice the use of different methods to achieve similar results in an attempt to expand my experience. Occasionally you will also see alternative working code commented out for the same reason.

<br />

### **Packages Used**

- **[Express](https://www.npmjs.com/package/express)** - Create Server
- **[Mongoose](https://www.npmjs.com/package/mongoose)** - Interact with DB
- **[Multer](https://www.npmjs.com/package/multer)** - Image upload
- **[Nodemailer](https://www.npmjs.com/package/nodemailer)** - Send emails
- **[Validator](https://www.npmjs.com/package/validator)** - Validate standard formats (like emails for example)
- **[Bcrypt](https://www.npmjs.com/package/bcrypt)** - Password encryption
- **[Jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken)** - Authentication with JWT 
- **[Lodash](https://www.npmjs.com/package/lodash)** - Useful utility functions
- **[Dotenv](https://www.npmjs.com/package/dotenv)** - Environment vars
- **[Bson](https://www.npmjs.com/package/bson)** - EJSON parser to import data from Extended JSON
- **[Cors](https://www.npmjs.com/package/cors)** - Enabling cors
- **[Html-to-text](https://www.npmjs.com/package/html-to-text)** - Convert html to text
- **[Pluralize](https://www.npmjs.com/package/pluralize)** - Convert language singulars into plurals
- **[Slugify](https://www.npmjs.com/package/slugify)** - Create slugs
- **[Pug](https://www.npmjs.com/package/pug)** - Templating engine
- **[Morgan](https://www.npmjs.com/package/morgan)** - Information logger for http requests.
- Also made use of several built-in Node modules like **fs** and **crypto** for example.

<br />

### **Services used**
- **MongoDB** - a popular NoSQL Database that speeds up the development process in a JS environment. Here it was used locally but can be easily adapted to an external DB server.
- **SendGrid** - Used its SMTP emailing service with registered API key to make sure emails don't end up in spam folders and are sent in a reliable way.

<br />

### **App code structure**

- The code was structured in a very modular way. There's seven main sections:
  - **Routes** - Where we define which URLs are controlled by which controllers
  - **Models** - Where we define all our mongoose Schemas with all the built-in validation, virtuals, methods, etc.
  - **Lib** - Where certain custom service functions and classes are defined.
  - **Controllers** - Where most of the app-specific logic resides.
  - **DbData** - Data repository with auto-import functionality for new app installations.
  - **Views** - Where pug templates reside.
  - **Public** - Where statically served files reside.


<br />

### **Strategy**

As this app was made with the intent of exploring and learning as much as possible, especially when it comes to important packages like Mongoose, I've tried to make as much use of different functionalities as I could. Here's a few slightly more complex features I'd like to highlight:
- Customizable advanced search for the user on the products route, this means the user can filter, sort, paginate, and do partial text search on all products via query params on the url.
- Advanced product statistics via MongoDB's aggregation framework.
- Image upload functionality for up to 10 images per product.
- Password reset functionality works by sending users an automated email with a token with nodemailer and a service called SendGrid.
- Customized Error handling with a custom Error class, and intuitive, human-readable error messages, when user is on a bad route.
- Deep model parameter checking to make sure the user isn't trying to change things that he shouldn't (the code inspects the model itself automatically and filters out certain parameters based on a given criteria, for example, if a certain key is a model reference then we shouldn't allow that key to be sent by the user in most circumstances). I've also added some customizability to these functions so they will accept exceptions to the default criteria via arguments.
- Model deletions trigger reference cleanups (where it makes sense).
- And here are some of the main Mongoose functionalities that I've used in the app:
> **Mongoose**
> - Virtuals
> - Virtual populates
> - Built-in validators
> - Custom validators
> - Async custom validators
> - Pre and post hooks (both synchronous and async)
> - Queries 
> - Aggregate (for advanced queries like statistics)  
> - Custom methods  
> - A mix of parent or child and parent + child referencing
> - Embedded referencing
> - Custom indexing (to make certain queries quicker)
> - Advanced queries customizable by the user with access to pagination, sorting, filtering, limiting, and text search.
> - and more...


<br />
<br />

## Author

* **Rui Santos** - © All rights reserved.
