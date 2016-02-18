//keydown event
document.addEventListener('keydown', function(event){
    switch (event.keyCode){
        case 38: // up
        case 87: // w
                client.key_up = true;
                break;
        case 37: // left
        case 65: // a
                client.key_left = true; 
                break;
        case 40: // down
        case 83: // s
                client.key_down = true;
                break;
        case 39: // right
        case 68: // d
                client.key_right = true;
                break;
        case 32: // space
                if ( client.jump === true ) velocity.y += 350;
                client.jump = false;
                break;
            case 13:
                testFunction();
                break;
        }
}, false);

//keyup event
document.addEventListener('keyup', function(event){
    switch(event.keyCode) {
        case 38: // up
        case 87: // w
                client.key_up = false;
                break;
        case 37: // left
        case 65: // a
                client.key_left = false;
                break;
        case 40: // down
        case 83: // s
                client.key_down = false;
                break;
        case 39: // right
        case 68: // d
                client.key_right = false;
                break;
        }
}, false);