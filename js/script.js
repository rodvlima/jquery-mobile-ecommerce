$(document).ready(() => {
    createTables();
    addProducts();
    accessPages();
    loadClickEvents();

    if (isLogged() == null) {
        window.location = "#loginPage";
    } else {
        init()
        window.location = "#mainPage";
    }
});

async function init(params) {
    await currentProfile();
    await loadProducts();
    await loadCart();
}
//#region Database Operations
function openDB() {
    const db = openDatabase('MyDataBase', '1.0', 'Project', 2 * 1024 * 1024);
    return db;
};

function createTables() {
    openDB().transaction(function (tx) {
        tx.executeSql('CREATE TABLE IF NOT EXISTS USERS (email unique, name, password)');
        tx.executeSql('CREATE TABLE IF NOT EXISTS PRODUCTS (id unique,product,category,price,quantity,image)');
        tx.executeSql('CREATE TABLE IF NOT EXISTS CART (username,productId,quantity)');
    });
};

function insert(table, fields, values) {
    const query = `INSERT INTO ${table} (${fields.join(",")}) VALUES (${Array.from(fields, x => '?').join(",")})`;
    openDB().transaction(function (tx) {
        tx.executeSql(query, values);
    });
}

function deleteData(table, fields, values) {
    const query = `DELETE FROM ${table} WHERE ${Array.from(fields, x => ` ${x} = ? `).join("and")}`;
    openDB().transaction(function (tx) {
        tx.executeSql(query, values);
    });
}

function update(table, fields, where) {
    const query = `UPDATE ${table} SET ${fields.join(",")} WHERE ${where.join(" AND ")}`;
    openDB().transaction(function (tx) {
        tx.executeSql(query);
    });
}

function select(table, where = null, params = []) {
    const query = `SELECT * FROM ${table} ${where ? `WHERE ${where} = ?` : ''}`;
    return new Promise(resolve => {
        openDB().transaction(function (tx) {
            tx.executeSql(query, params,
                function (tx, results) {
                    resolve([...results.rows]);
                },
                null);
        });
    });
};

function selectIn(table, whereIn, params) {
    const query = `SELECT * FROM ${table} WHERE ${whereIn} in (${Array.from(params, x => '?').join(",")})`;
    return new Promise(resolve => {
        openDB().transaction(function (tx) {
            tx.executeSql(query, params,
                function (tx, results) {
                    resolve([...results.rows]);
                },
                null);
        });
    });
}
//#endregion

//#region Login Operations
async function validateLogin() {
    let users = await select('USERS', 'email', [$("#username").val()]);
    if (users.length > 0 && users[0]["password"] == $("#password2").val()) {
        return users;
    }
    return false;
};

function isLogged() {
    return localStorage.getItem("isLogged");
};

function storeLogin(username) {
    localStorage.setItem("isLogged", username);
};

function logout() {
    localStorage.removeItem("isLogged");
    window.location = "#loginPage";
    window.location.reload();
};

async function login() {
    const user = await validateLogin();
    if (user) {
        storeLogin(user[0]["email"]);
        window.location = "#mainPage";
        init();
    } else {
        $("#error-sign-in").popup("open");
    };
}
//#endregion

// #region User Operations
function updateUserInfo() {
    const fields = $("#updForm input");
    const isValid = validateEmptyFields(fields);
    if (isValid) {
        update('USERS',
            ['name = \''+$("#updName").val()+'\'', 
            'password = \''+$("#updPassword").val()+'\''],
            ['email = \''+ isLogged()+'\'']);
        window.location = "#mainPage";
        window.location.reload();
    };
}

function registerNewUser() {
    const fields = $("#regForm input")
    const isValid = validateEmptyFields(fields);
    if (isValid) {
        insert('USERS', ['email', 'name', 'password'], [$("#regEmail").val(), $("#regName").val(), $("#regPassword").val()]);
        window.location = "#loginPage";
    } else {
        $("#popup").popup("open");
    };
}

async function currentProfile() {
    if (isLogged()) {
        let users = await select('USERS', 'email', [isLogged()]);
        $("#welcome").text("Welcome " + users[0]["name"]);
        $("#profEmail").text("Email/Username: " + users[0]["email"]);
        $("#profLogin").text("Login: " + users[0]["email"]);
        $("#profName").text("Name: " + users[0]["name"]);
    }
};
//#endregion

//#region Util Operations

function loadClickEvents() {
    $("#register").click(registerNewUser);
    $("#updateInfo").click(updateUserInfo);
    $("#login").click(login);
    $("#logoff").click(logout);
};

function validateEmptyFields(fields) {
    let valid = true;
    fields.each(function () {
        if ($(this).val() == "") {
            valid = false;
            return false;
        }
    });
    return valid;
}

function accessPages() {
    $(window).on("navigate", () => {
        let hash = location.hash;
        if ((hash == "#mainPage" || hash == "") && isLogged() == null) {
            window.location = "#loginPage";
        } else if ((hash == "#loginPage" || hash == "registerPag") && isLogged() != null) {
            window.location = "#mainPage";
        }
    });
};
//#endregion

//#region Product Operations
let productSelected = {};

async function updateProductSelected(id) {
    const product = await select('PRODUCTS', 'id', [id]);
    productSelected = product.length > 0 ? product[0] : {};
}

function addProducts() {
    const fields = ['id', 'product', 'category', 'price', 'quantity', 'image'];
    const values = [
        [1, 'iPhone X 64GB', 'smartphone', '1000', '1', 'https://image.coolblue.be/422x390/products/1033437'],
        [2, 'Apple iPhone 8', 'smartphone', '1300', '1', 'https://image.coolblue.be/max/270x220/products/1033402'],
        [3, 'Toshiba 50" 4K', 'tv', '2300', '1', 'https://multimedia.bbycastatic.ca/multimedia/products/500x500/125/12598/12598561.jpg'],
        [4, 'Samsung 55" 4K', 'tv', '800', '1', 'https://multimedia.bbycastatic.ca/multimedia/products/1500x1500/129/12943/12943557.jpg'],
    ];
    values.forEach(e => insert('PRODUCTS', fields, e));
}

function templateListProducts(products) {
    return products.map(product => `
            <li class="ui-li-has-thumb">
                <a class="nav" href="#details-page" data-id="${product.id}" data-transition="slide">
                    <img src="${product.image}">
                    <h2>${product.product}</h2>
                    <p>$ ${product.price} CAD</p>
                    <p>${product.quantity > 0?product.quantity+" in Stock":"Not Avalilable"}</p>
                </a>
            </li>
        `).join("");
}

function templateProductDetail(product) {
    return `<div id="details-page-content">
                <h1>Name: ${product.product}</h1>
                <p>Category: ${product.category}</p>
                <p>Price: ${product.price}</p>
                <p>${product.quantity > 0?product.quantity+" in Stock":"Not Avalilable"}</p>
                <img width="200" src="${product.image}"
                    alt="">
                <form>
                    <button id="add-cart" data-rel="popup" ></button>
                </form>
            </div>
           `;
}

function filter(products, filter = null) {
    return filter ? products.filter(p => p.category == filter) : products;
}

async function loadProducts() {
    const products = await select('PRODUCTS');

    const allProducts = templateListProducts(products);
    $('#list-cat-all').append(allProducts);
    $('#list-cat-all').listview("refresh");

    const phoneProducts = templateListProducts(filter(products, 'smartphone'));
    $('#list-cat-phone').append(phoneProducts);
    $('#list-cat-phone').listview("refresh");

    const tvProducts = templateListProducts(filter(products, 'tv'));
    $('#list-cat-tv').append(tvProducts);
    $('#list-cat-tv').listview("refresh");

    $(".nav").click(async function () {
        await updateProductSelected($(this).data("id"));
        loadProductDetail($(this).attr("href"));
    });
}

async function loadProductDetail() {
    const productElement = templateProductDetail(productSelected);
    $('#details-page .ui-content').empty();
    $('#details-page .ui-content').append(productElement);
    $('#details-page-content').trigger("create");
    cartButton($('#add-cart'),productSelected.id);
    $('#add-cart').click(async function (e) {
        await updateCart(e, productSelected);
        await loadCart();
        cartButton($('#add-cart'),productSelected.id);
    });
}

async function cartButton(buttonElement,productId){
    const find = await getProductCart(productSelected)
    if(!find){
        if(await checkQuantity(productId)){
            buttonElement.html("Add to cart");
        }else{
            buttonElement.html("Sorry, product sold out").prop("disabled",true);
        }
    }else{
        buttonElement.html("Remove from cart");
    }
}

async function checkQuantity(productId){
    let products = await select('PRODUCTS','id', [productId]);
    if(!products[0].quantity > 0){
        return false;
    }else{
        return true;
    }
}
async function updateQuantity(operator,productId){
    await update('PRODUCTS',
    ['quantity = quantity'+operator+'1'],
    ['id = '+productId]);
    return true;
}

//#endregion

//#region Cart Operations
async function getProductCart(product) {
    const email = isLogged();
    const productFromTable = await select('CART', 'username', [email]);
    const find = productFromTable.find(p => p.productId == product.id);
    return find;
}

async function updateCart(e, product) {
    e.preventDefault();
    const find = await getProductCart(product);
    const email = isLogged();
    if (!find) {
        insert(
            'CART',
            ['username', 'productId', 'quantity'],
            [email, product.id, 1]
        );
        updateQuantity('-',product.id);
        return true;
    } else {
        deleteData(
            'CART',
            ['username', 'productId'],
            [email, product.id]
        );
        updateQuantity('+',product.id);
        return false;
    }
}

async function loadCart() {
    const cart = await select('CART', 'username', [isLogged()]);
    const products = await selectIn('PRODUCTS', 'id', cart.map(e => e.productId));
    const allProducts = templateListProducts(products);
    $('#list-cart').empty();
    $('#list-cart').append(allProducts);
    $(".nav").click(async function () {
        await updateProductSelected($(this).data("id"));
        loadProductDetail($(this).attr("href"));
    });
    $('#list-cart').listview("refresh");
}
//#endregion




