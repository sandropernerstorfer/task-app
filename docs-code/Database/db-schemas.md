<h1>MongoDB Schemas</h1>

---------------------------------------------------------------------------

**_USER_**
    name: REQUIRED STRING
    email: REQUIRED STRING
    password: REQUIRED STRING
    sessionid: REQUIRED STRING
    desks: ARRAY of STRINGS
    sharedDesks: ARRAY of STRINGS
    invites: ARRAY of STRINGS
    image: STRING / default NULL

---------------------------------------------------------------------------

**_DESK_**
    name: REQUIRED STRING
    color: REQUIRED STRING
    admin: REQUIRED STRING
    members: ARRAY of STRINGS
    lists: ARRAY of SCHEMA(List)
    date: Date.now

---------------------------------------------------------------------------

**_LIST_**
    name: REQUIRED STRING
    tasks: ARRAY of SCHEMA(Task)
    order: Number / default 0

---------------------------------------------------------------------------

**_TASK_**
    name: REQUIRED STRING,
    description: STRING / default '',
    location: STRING / default NULL,
    date: Date.now

---------------------------------------------------------------------------