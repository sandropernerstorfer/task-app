<h1>Server Dokumentation</h1>

---------------------------------------------------------------------------

**_IMPORT PACKAGES_**
##### require('express') / app = express()
    express framework und app initialisierung

##### require('express-session')
    express-session package für user-session handling via cookie und req.session objekt

##### require('socket..io')
    socket.io package für realtime client/server verbindungen (websockets)

##### require('cookie-parser')
    cookie-parser für middleware zur cookie verarbeitung

##### require('mongoose')
    mongoDB "framework" / tool

##### require('dotenv/config')
    environment variables

---------------------------------------------------------------------------

**_IMPORT ROUTES_**
##### require(./routes/ROUTE)
    importiere routen (.js dateien) aus 'routes' ordner

---------------------------------------------------------------------------

**_MIDDLEWARE_**
##### mongoose.set('useFindAndModify', false)
    veraltete mongoose funktion exkludieren

##### app.use(express.static('static'))
    static ordner angeben

##### app.use(express.json())
    automatisches JSON Parsing

##### app.use(express.urlencoded({ extended: true }))
    automatisches urlencoded payload Parsing

##### app.use(cookieParser())
    automatisches cookie parsing. wird in req.cookies.-cookieName- gespeichert

##### app.use(session(......))
    konfiguriert die express user-session mit secret key und sonstigen parametern

---------------------------------------------------------------------------

**_CHECK STATUS_**
##### Get and Save User Data (Middleware)
    kontrolliert den User status und speichert user daten in das session objekt
    ist der session cookie & session data vorhanden wird die middleware übersprungen
    ist nur der session cookie vorhanden wird damit der passende user in der Datenbank gesucht
    wird kein User gefunden (zB. wegen falscher cookieID) wird der cookie gelöscht und session data zurückgesetzt
    ansonsten speichere die nötigen user daten in das session objekt

---------------------------------------------------------------------------

**_ROUTING_**
##### app.use( route, imported Route )
    requests auf die angegebenen routen zu den importierten routen weiterleiten

---------------------------------------------------------------------------

**_PORT / DB CONNECTION_**
##### app.listen(PORT)
    server hört auf angegebenen port

##### mongoose.connect()
    verbinde mongoDB datenbank mit angegebenen umgebungs-variablen

---------------------------------------------------------------------------

**_SOCKETS_** 
##### socket.on( 'join' )
    join wird von client ausgelöst wenn ein user einen desk öffnet
    client schickt: url-path und username. Welche im socket gespeichert werden
    socket tritt raum bei welcher den namen der url-location hat

##### socket.on( 'board-join' )
    board-join wird von client ausgelöst wenn ein user sein dashboard öffnet
    Tritt einem privaten raum bei welcher dann live invites empfangen kann

##### socket.on( 'sent-invite' ).emit( 'new-invite' )
    sent-invite wird von client im desk ausgelöst wenn eine einladung verschickt wird
    server löst dann new-invite im client dashboard des eingeladenen users aus

##### socket.on( 'invite-accepted' ).emit( 'new-member' )
    invite-accepted wird von client im dashboard ausgelöst wenn eine einladung angenommen wird
    server löst new-member in desk-clients aus und lädt die neue member liste

##### socket.on( 'member-leaving' ).emit( 'left-member' )
    member-leaving wird von client ausgelöst wenn dieser user den desk verlässt
    server löst left-member aus und entfernt den user aus den clients

##### socket.on( 'desk-deletion' ).emit( 'desk-deleted' ).emit( 'board-deleted' )
    desk-deletion wird von client ausgelöst wenn admin den desk löscht
    löst in den anderen clients desk-deleted aus und bringt sie zurück zu ihren dashboards
    löst in den member boards board-deleted aus und entfernt den desk vom board

##### socket.on( 'chat-send' ).emit( 'chat-receive' )
    chat-send wird von client ausgelöst wenn eine nachricht verschickt wird
    server löst dann chat-receive in den anderen clients im selben raum aus

##### socket.on( 'chat-here' ).emit( 'chat-otherHere' )
    chat-here wird von client ausgelöst wenn ein user einen desk öffnet
    server löst dann chat-otherHere in den anderen clients im selben raum aus


##### socket.on( 'status-here' ).emit( 'status-otherHere' )
    status-here wird von client ausgelöst wenn ein anderer user auf den desk kommt
    server löst status-otherHere in den anderen clients aus um dem neuzugang anzuzeigen wer bereits online ist


##### socket.on( 'disconnect' ).emit( 'desk-leave' )
    disconnect wird ausgelöst wenn die socket verbindung vom client getrennt wird
    server löst dann desk-leave in den anderen clients im selben raum aus
    schickt username mit

---------------------------------------------------------------------------