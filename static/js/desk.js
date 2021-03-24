import validation from './scripts/validation.js';
let userData, deskData, adminData, memberData;
fetch('/desk/deskdata')
.then(res => res.json())
.then(data => {
    userData = data.user;       // OBJECT - USER:               _id, name
    deskData = data.desk;       // OBJECT - DESK:               _id, name, color, lists
    adminData = data.admin;     // OBJECT - ADMIN:              _id, name, email, image
    memberData = data.members;  // ARRAY OF OBJECTS - MEMBERS:  _id, name, email, image
    renderDeskname();
    renderMembers();
    addRoleDependingEvents();
    renderLists();

    if(memberData.length > 0) setupSocket();
});

function renderDeskname(){
    document.querySelector('#topDeskname').textContent = deskData.name;
    document.querySelector('#renameInput').value = deskData.name;
    document.querySelector('#chatDeskname').textContent = deskData.name;
    document.title = `Task-App | ${deskData.name}`;
};

function renderMembers(){
    const admin = document.querySelector('#admin');
    const url = adminData.image == null ? '../../assets/img/user-default.png' : `https://res.cloudinary.com/sandrocloud/image/upload/w_50,c_scale/${adminData.image}`;
    admin.style.backgroundImage = `url(${url})`;
    admin.setAttribute('title', adminData.name);

    const membersDiv = document.querySelector('#topMembers');
    memberData.forEach(member => {
        const url = member.image == null ? '../../assets/img/user-default.png' : `https://res.cloudinary.com/sandrocloud/image/upload/w_50,c_scale/${member.image}`;
        membersDiv.innerHTML += `<div id="topMember${member._id}" class="member-card"></div>`;
        const currentMember = document.getElementById(`topMember${member._id}`);
        currentMember.style.backgroundImage = `url(${url})`;
        currentMember.setAttribute('title', member.name);
    });
};

function addRoleDependingEvents(){
    const deskActionText = document.querySelector('#deskActionText');
    const deskActionBtn = document.querySelector('#deskActionBtn');

    if(userData._id == adminData._id){
        deskActionText.innerHTML = '<i id="dangerIcon" class="fas fa-exclamation-triangle"></i> Delete Desk';
        deskActionBtn.textContent = 'Delete';
        const elements = document.querySelectorAll('.accessDisabled');

        elements.forEach( element => {
            element.classList.remove('accessDisabled');
        });

        elements[0].setAttribute('data-bs-toggle', 'modal');
        elements[0].setAttribute('data-bs-target', '#inviteModal');

        const inviteForm = document.querySelector('#inviteForm');
        inviteForm.addEventListener('submit', e => {
            e.preventDefault();
            const mail = inviteForm.inviteEmail.value.trim();
            const error = validation.mail(mail);
            const errorField = document.querySelector('#inviteError');
            if(error != ''){
                errorField.textContent = error;
                return;
            }
            const checkMembers = memberData.find( member => {
                return member.email == mail;
            });
            if(checkMembers){
                errorField.textContent = 'User is already a Member';
                return;
            }
            errorField.innerHTML = '&nbsp;';
            fetch('/user/invite', {
                method : 'POST',
                body : JSON.stringify({
                    mail : mail,
                    deskID : deskData._id
                }),
                headers : {'Content-type' : 'application/json; charset=UTF-8'}
            })
            .then(res => res.json())
            .then(status => {
                if(!status){
                    errorField.textContent = 'No user with this Email found';
                }
                else{
                    errorField.innerHTML = `<span style="color: #23CE6B;">${status.name} invited !</span>`;
                    inviteForm.reset();
                }
            });
        });
        elements[2].addEventListener('click', () => {
            const newName = document.querySelector('#renameInput').value.trim();
            if(newName == deskData.name) return;
            fetch('/desk/deskname', {
                method: 'PATCH',
                body: JSON.stringify({deskname : newName}),
                headers: {'Content-type' : 'application/json; charset=UTF-8'}
            })
            .then(res => res.json())
            .then(deskname => {
                deskData.name = deskname;
                renderDeskname();
            });
        });
        deskActionBtn.addEventListener('click', () => {
            const confirmed = confirm(`Are you sure you want to delete this desk:\n"${deskData.name}"`);
            if(confirmed){
                fetch(`/desk/delete`, {
                    method: 'DELETE'
                })
                .then(location.href = '/board');
            };
        });
    }
    else{
        deskActionText.innerHTML = '<i id="dangerIcon" class="fas fa-exclamation-triangle"></i> Leave Desk';
        deskActionBtn.textContent = 'Leave';
        deskActionBtn.addEventListener('click', () => {
            const confirmed = confirm('You will no longer be a Member on this Desk\n\nContinue ?');
            if(confirmed){
                fetch(`/desk/leave`, {
                    method: 'DELETE',
                })
                .then(res => res.json())
                .then(res => {
                    if(res) location.href = '/board';
                });
            };
        });
    };
};

const cellContainer = document.querySelector('#cellContainer');
addDragOverList(cellContainer);

function renderLists(){

    cellContainer.innerHTML = '';
    const lists = deskData.lists;

    // SORT LISTS BY ORDER
    lists.sort((a,b) => {
        if(a.order < b.order) return -1;
        if(a.order > b.order) return 1;
        return 0;
    });

    lists.forEach( list => {
        const listTemplate = document.querySelector('#listTemplate').content.cloneNode(true);
        listTemplate.querySelector('.list').id = list._id;
        listTemplate.querySelector('.list-name-textarea').textContent = list.name; 

        // DELETE LIST EVENT
        listTemplate.querySelector('.delete-list').addEventListener('click', () => { deleteList(list._id)});

        const taskContainer = listTemplate.querySelector('.list-tasks');
        addDragOverTask(taskContainer);
        addDragStartEvent(listTemplate.querySelector('.list-cell'));
        addDragEndEvent(listTemplate.querySelector('.list-cell'));

        // SORT TASKS BY ORDER
        list.tasks.sort((a,b) => {
            if(a.order < b.order) return -1;
            if(a.order > b.order) return 1;
            return 0;
        });

        // RENDER TASKS
        list.tasks.forEach( task => {
            const taskTemplate = document.querySelector('#taskTemplate').content.cloneNode(true);
            taskTemplate.querySelector('.task').id = task._id;
            taskTemplate.querySelector('.taskName').textContent = task.name;
            if(task.members.includes(userData._id)){
                taskTemplate.querySelector('.taskMarker').classList.remove('d-none');
            };

            addDragStartEvent(taskTemplate.querySelector('.task'));
            addDragEndEvent(taskTemplate.querySelector('.task'));

            taskContainer.appendChild(taskTemplate);
        });

        // APPEND FINAL LIST
        cellContainer.appendChild(listTemplate);
    });
    
    if(lists.length > 0){
        document.querySelectorAll('.taskInfo').forEach( button => {
            const listID = button.closest('.list').id;
            const taskID = button.closest('.task').id;
            button.addEventListener('click', () => {openTaskModal(listID, taskID)});
        });
        document.querySelectorAll('.taskComplete').forEach( button => {
            const listID = button.closest('.list').id;
            const taskID = button.closest('.task').id;
            button.addEventListener('click', () => {deleteTask(listID, taskID)});
        });
        document.querySelectorAll('.list-name-textarea').forEach( textarea => {
            autoSetTextareaHeight(textarea);
            textarea.addEventListener('input', () => {
                autoSetTextareaHeight(textarea); 
            });
        });
    }
    
};

// LIST AND TASK DRAGGING

// Make list only draggable when mouse over drag icon
cellContainer.addEventListener('mouseover', e => {
    if(e.target.matches('.grab-icon')){
        e.target.closest('.list-cell').setAttribute('draggable', 'true');
    }
});
cellContainer.addEventListener('mouseout', e => {
    if(e.target.matches('.grab-icon')){
        e.target.closest('.list-cell').setAttribute('draggable', 'false');
    }
});

let draggedElement, oldList, newList, oldOrder, newOrder;

// Add .dragging class
function addDragStartEvent(element){
    element.addEventListener('dragstart', e => {
        e.stopPropagation();
        element.classList.add('dragging');
        if(element.classList.contains('task')){
            draggedElement = 'task';
            oldList = element.closest('.list').id;
            oldOrder = getCurrentTaskIndex(element.id);
        }
        else if(element.classList.contains('list-cell')){
            draggedElement = 'list';
            oldOrder = getCurrentListIndex(element.querySelector('.list').id);
        };
    });    
};

// Remove .dragging class and handle new Order
function addDragEndEvent(element){
    element.addEventListener('dragend', e => {
        e.stopPropagation();
        draggedElement = undefined;
        element.classList.remove('dragging');

        if(element.classList.contains('task')){
            newList = element.closest('.list').id;
            newOrder = getCurrentTaskIndex(element.id);

            if(oldList == newList && oldOrder == newOrder) return;

            const list1 = createTaskOrderArray(oldList);
            const list2 = newList === oldList ? undefined : createTaskOrderArray(newList);
            saveNewTaskOrder(list1,list2);
        }
        else if(element.classList.contains('list-cell')){
            newOrder = getCurrentListIndex(element.querySelector('.list').id);

            if(oldOrder == newOrder) return;

            const array = createListOrderArray();
            saveNewListOrder(array);
        };
    });
};

// Get current List or Task index to check if any order changed (prevent useless fetch)
function getCurrentListIndex(listID){
    const lists = Array.from(document.querySelectorAll('.list'));
    const getIndexWithID = list => list.id == listID;
    return lists.findIndex(getIndexWithID);
};
function getCurrentTaskIndex(taskID){
    const tasks = Array.from(document.getElementById(taskID).closest('.list-tasks').querySelectorAll('.task'));
    const getIndexWithID = task => task.id == taskID;
    return tasks.findIndex(getIndexWithID);
};

// Create Array containing ID's and Order(index)
function createTaskOrderArray(listID){
    const tasks = document.getElementById(listID).querySelectorAll('.task');
    let array = [listID];
    tasks.forEach( (task, i) => {
        array.push({id: task.id, order: i});
    });
    return array;
};
function createListOrderArray(){
    const lists = document.querySelectorAll('.list');
    let array = [];
    lists.forEach( (list, i) => {
        array.push({id: list.id, order: i});
    });
    return array;
};

// Save new Lists or Tasks Order (fetch request)
function saveNewTaskOrder(list1,list2){
    fetch('/desk/task/order', {
        method: 'PATCH',
        body: JSON.stringify({list1: list1, list2: list2}),
        headers: {'Content-Type' : 'application/json; charset=UTF-8'}
    })
    .then(res => res.json())
    .then(newLists => {
        if(!newLists) return;
        deskData.lists = newLists;
    });
};
function saveNewListOrder(array){
    fetch('/desk/list/order', {
        method: 'PATCH',
        body: JSON.stringify(array),
        headers: {'Content-Type' : 'application/json; charset=UTF-8'}
    })
    .then(res => res.json())
    .then(newLists => {
        if(!newLists) return;
        deskData.lists = newLists;
    });
};

// Fires when drag cursor is over CONTAINER
function addDragOverList(container){
    container.addEventListener('dragover', e => {
        if(draggedElement == 'task') return;
        e.preventDefault();
        const afterTask = getDragAfterList(container, e.clientX);
        const draggable = document.querySelector('.dragging');
        if(afterTask == null){
            container.appendChild(draggable);
        }
        else{
            container.insertBefore(draggable, afterTask);
        };
    });
};
function addDragOverTask(container){
    container.addEventListener('dragover', e => {
        if(draggedElement == 'list') return;
        e.preventDefault();
        const afterTask = getDragAfterTask(container, e.clientY);
        const draggable = document.querySelector('.dragging');
        if(afterTask == null){
            container.appendChild(draggable);
        }
        else{
            container.insertBefore(draggable, afterTask);
        };
    });
};

// Fires everytime dragover event fires. And RETURNS THE AFTER ELEMENT
function getDragAfterList(container, axis){
    const draggableElements = [...container.querySelectorAll('.list-cell:not(.dragging)')];
    return draggableElements.reduce( (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = axis - box.left - box.width/1.2;
        if(offset < 0 && offset > closest.offset){
            return { offset: offset, element: child};
        }
        else{
            return closest;
        };
    }, { offset: Number.NEGATIVE_INFINITY }).element;
};
function getDragAfterTask(container, axis){
    const draggableElements = [...container.querySelectorAll('.task:not(.dragging)')];
    return draggableElements.reduce( (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = axis - box.top - box.height/2;
        if(offset < 0 && offset > closest.offset){
            return { offset: offset, element: child};
        }
        else{
            return closest;
        };
    }, { offset: Number.NEGATIVE_INFINITY }).element;
};

// Invite Modal - Input focus und Error Reset
const inviteModal = document.querySelector('#inviteModal');
inviteModal.addEventListener('shown.bs.modal', () => {
    document.querySelector('input[name="inviteEmail"]').focus();
});
inviteModal.addEventListener('hidden.bs.modal', () => {
    document.querySelector('#inviteError').innerHTML = '&nbsp;';
});

// MENU show/hide
const openMenu = document.querySelector('#menuBtn');
openMenu.addEventListener('click', () => {
    document.querySelector('#sideMenu').classList.toggle('d-none');
});

// CREATE LIST: BUTTON / FORM TOGGLE
function toggleListCreation(){
    openListForm.classList.toggle('d-none');
    listForm.classList.toggle('d-none');    
};

// TRY TO CLOSE OPEN FORMS OR TASKS
function closeOpenForms(){
    try{
        document.querySelector('#cancelTask').click();
    }
    catch(err){}
    if(!listForm.classList.contains('d-none')){
        document.querySelector('#cancelList').click();
    }
};
function closeOpenTasks(){
    try{
        document.querySelectorAll('.task-expand').forEach(element => {
            element.classList.remove('task-expand');
        });
        document.querySelectorAll('.task-buttons').forEach(element => {
            element.classList.add('task-closed');
        });
    }
    catch(err){}
};

// ADD NEW LIST
const openListForm = document.querySelector('#addListBtn');
const listForm = document.querySelector('#listForm');

openListForm.addEventListener('click', () => {
    closeOpenForms();
    closeOpenTasks();
    toggleListCreation();
    listForm.querySelector('#newListname').focus();
});

listForm.addEventListener('reset', () => {
    toggleListCreation();
});

listForm.addEventListener('submit', e => {
    e.preventDefault();
    const listName = listForm.listName.value.trim();
    fetch('/desk/list', {
        method: 'POST',
        body: JSON.stringify({name: listName}),
        headers: {'Content-type' : 'application/json; charset=UTF-8'}
    })
    .then(res => res.json())
    .then(newLists => {
        deskData.lists = newLists;
        toggleListCreation();
        renderLists();
        listForm.listName.value = '';
    });
});

// LIST ACTIONS
// ADD TASK BUTTON / SAVE TASK / CANCEL TASK
cellContainer.addEventListener('click', e => {
    if(e.target.matches('.addTaskBtn')){
        closeOpenForms();
        e.target.closest('.addTask').innerHTML = `
        <form id="taskForm">
            <input id="newTaskname" type="text" placeholder="Taskname...">
            <button type="submit" id="saveTask" IsTabStop="false"><i class="far fa-check-circle"></i></button>
            <button type="button" id="cancelTask" IsTabStop="false"><i class="far fa-times-circle"></i></button>
        </form>`;
        document.getElementById('newTaskname').focus();
        document.getElementById('saveTask').addEventListener('click', e => {
            e.preventDefault();
            const taskName = e.target.previousElementSibling.value.trim();
            if(taskName.length == 0) return;
            const listID = e.target.closest('.list').id;
            fetch('/desk/task', {
                method: 'POST',
                body: JSON.stringify(
                    {
                        name: taskName,
                        listID: listID
                    }
                ),
                headers: {'Content-Type' : 'application/json; charset=UTF-8'}
            })
            .then(res => res.json())
            .then(newLists => {
                deskData.lists = newLists;
                renderLists();
                const currentList = document.getElementById(listID);
                currentList.querySelector('.addTaskBtn').click();
            });
        });
    }
    if(e.target.matches('#cancelTask')){
        e.target.closest('.addTask').innerHTML = `
        <button class="addTaskBtn"><i class="fas fa-plus"></i> Add Task</button>`;
    }
});

// EXPAND / COLLAPSE TASK FIELD
cellContainer.addEventListener('click', e => {
    if(!e.target.matches('.task')) return;
    closeOpenForms();
    if(!e.target.classList.contains('task-expand')){
        closeOpenTasks();
    }
    const taskButtons = e.target.querySelector('.task-buttons');
    e.target.classList.toggle('task-expand');
    setTimeout(() => {
        taskButtons.classList.toggle('task-closed');    
    }, 85);
});

// DELETE LIST
function deleteList(listID){
    fetch(`/desk/list/${listID}`, {
        method: 'DELETE'
    })
    .then(res => res.json())
    .then(newLists => {
        if(!newLists) return;
        deskData.lists = newLists;
        document.getElementById(listID).closest('.list-cell').remove();
    });
};

// LOAD SPECIFIC TASK INFO
const taskNameTextarea = document.querySelector('#taskNameTextarea');
const taskDescTextarea = document.querySelector('#taskDescriptionTextarea');
const availableRow = document.querySelector('#availableRow');
const assignedRow = document.querySelector('#assignedRow');
let currentList, currentTask;

function openTaskModal(listID, taskID){
    currentList = listID;
    currentTask = taskID;
    // When modal open Auto set Textarea Height to content size
    setTimeout(() => {
        autoSetTextareaHeight(taskNameTextarea);
        autoSetTextareaHeight(taskDescTextarea);
    }, 170);
    // Find specific Task
    const task = findSpecificTask(listID, taskID);
    // Find and Deconstruct Task in List
    const {name, description, members, date} = task;
    // Display Taskname + Task Description
    taskNameTextarea.value = name;
    taskDescTextarea.value = description;
    // Get Time that passed since creation
    const timeSinceCreation = calculatePassedTime(new Date(date).getTime());
    document.querySelector('#passedTime').textContent = timeSinceCreation;
    // Display Members to add and already added members
    const {available, assigned} = filterTaskMembers(members);

    availableRow.innerHTML = '';
    assignedRow.innerHTML = '';

    if(available.length == 0){
        availableRow.innerHTML = `<span class="no-members">All members are working on this Task</span>`;
    }
    else renderTaskMembers(availableRow, available);
    
    if(assigned.length == 0){
        assignedRow.innerHTML = `<span class="no-members">Add members that are working on this Task</span>`;
    }
    else renderTaskMembers(assignedRow, assigned);
};

function findSpecificTask(listID, taskID){
    const getIndexWithID = list => list._id == listID;
    const listIndex = deskData.lists.findIndex(getIndexWithID);
    const list = deskData.lists[listIndex];
    return list.tasks.find( task => task._id == taskID);
};

/**
 * ## calculatePassedTime()
 * Rechnet die vergangene Zeit zwischen 2 Zeitpunkten und gibt die Anzahl in Tagen, Stunden, Minuten oder Sekunden zurück.
 * @param {STRING} earlierMS Früherer Zeitpunkt in ms.
 * @param {STRING} laterMS   Späterer Zeitpunkt in ms. <- (Optional)
 * @default Date.now()
 * @returns Nach dem Errechnen der vergangenen Zeit wird der Wert je nach Ergebnis in: Days, Hours, Minutes or Seconds zurück gegeben.
 */
function calculatePassedTime(earlierMS, laterMS = Date.now()){
    // if minimum 1 Day: return Days
    let msBetween = (laterMS - earlierMS) / (1000*3600*24);
    if(msBetween >= 1){
        const days = Math.floor(msBetween);
        return days == 1 ? days+' day' : days+' days';
    }
    // if minimum 1 Hour: return Hours
    msBetween = (laterMS - earlierMS) / (1000*3600);
    if(msBetween >= 1){
        const hours = Math.floor(msBetween);
        return hours == 1 ? hours+' hour' : hours+' hours';
    }
    // if minimum 1 Minute: return Minutes
    msBetween = (laterMS - earlierMS) / 60000;
    if(msBetween >= 1){
        const minutes = Math.floor(msBetween);
        return minutes == 1 ? minutes+' minute' : minutes+' minutes';
    }
    // if below 1 Minute: return Seconds
    msBetween = (laterMS - earlierMS) / 1000;
    const seconds = Math.floor(msBetween);
    return seconds == 1 ? seconds+' second' : seconds+' seconds';
};

/**
 * 
 * @param {ARRAY} taskMembers Array von member ID's die dem task zugewiesen sind.
 * @returns {OBJECT} Objekt mit zwei Arrays. eines für die zugewiesenen und eines für die verfügbaren member
 */
function filterTaskMembers(taskMembers){
    let allMembers = [...memberData];
    allMembers.unshift(adminData);
    let available = [], assigned = [];

    if(taskMembers.length == 0){
        available = allMembers;
    }
    else{
        taskMembers.forEach( member => {
            let found = allMembers.find( deskMember => {
                if(deskMember._id == member){
                    const index = allMembers.indexOf(deskMember);
                    allMembers.splice(index,1);
                    return deskMember;
                }
            });
            assigned.push(found);
        });
        available = allMembers;
    };
    return { available: available, assigned: assigned };
};

function renderTaskMembers(element, array){
    array.forEach( user => {
        const url = user.image == null ? '../../assets/img/user-default.png' : `https://res.cloudinary.com/sandrocloud/image/upload/w_40,c_scale/${user.image}`;
        if(element.matches('#availableRow')){
            element.innerHTML += `<div class="member-box"><div id="${user._id}" class="task-member"><i class="fas fa-plus-circle"></i></div><span>${user.name}</span></div>`;
        }
        else{
            element.innerHTML += `<div class="member-box"><div id="${user._id}" class="task-member"><i class="fas fa-minus-circle"></i></div><span>${user.name}</span></div>`;
        }
        const div = document.getElementById(`${user._id}`);
        div.style.backgroundImage = `url(${url})`;
        div.setAttribute('title', user.name);
    });   
};

// Assign member to task
document.querySelector('#availableRow').addEventListener('click', e => {
    if(!e.target.matches('.task-member')) return;
    const userID = e.target.id;
    fetch(`/desk/${currentList}/${currentTask}/member`, {
        method: 'POST',
        body: JSON.stringify({
            userID: userID
        }),
        headers: {'Content-Type':'application/json; charset=UTF-8'}
    })
    .then(res => res.json())
    .then(newLists => {
        if(!newLists) return;
        deskData.lists = newLists;
        const task = findSpecificTask(currentList, currentTask);
        const {members} = task;
        const {available, assigned} = filterTaskMembers(members);

        availableRow.innerHTML = '';
        assignedRow.innerHTML = '';

        if(available.length == 0){
            availableRow.innerHTML = `<span class="no-members">All members are working on this Task</span>`;
        }
        else renderTaskMembers(availableRow, available);
        
        if(assigned.length == 0){
            assignedRow.innerHTML = `<span class="no-members">Add members that are working on this Task</span>`;
        }
        else renderTaskMembers(assignedRow, assigned);

        if(userID == userData._id){
            document.getElementById(currentTask).querySelector('.taskMarker').classList.remove('d-none');
        };
    });
});

// Remove member from task
document.querySelector('#assignedRow').addEventListener('click', e => {
    if(!e.target.matches('.task-member')) return;
    const userID = e.target.id;
    fetch(`/desk/${currentList}/${currentTask}/${userID}`, {
        method: 'DELETE'
    })
    .then(res => res.json())
    .then(newLists => {
        if(!newLists) return;
        deskData.lists = newLists;
        const task = findSpecificTask(currentList, currentTask);
        const {members} = task;
        const {available, assigned} = filterTaskMembers(members);

        availableRow.innerHTML = '';
        assignedRow.innerHTML = '';

        if(available.length == 0){
            availableRow.innerHTML = `<span class="no-members">All members are working on this Task</span>`;
        }
        else renderTaskMembers(availableRow, available);
        
        if(assigned.length == 0){
            assignedRow.innerHTML = `<span class="no-members">Add members that are working on this Task</span>`;
        }
        else renderTaskMembers(assignedRow, assigned);

        if(userID == userData._id){
            document.getElementById(currentTask).querySelector('.taskMarker').classList.add('d-none');
        };
    });
});

// Keep resizing textarea on input
taskNameTextarea.addEventListener('input', e => {
    autoSetTextareaHeight(taskNameTextarea); 
});
taskDescTextarea.addEventListener('input', e => {
    autoSetTextareaHeight(taskDescTextarea);
});

// Update Task-Name
taskNameTextarea.addEventListener('change', () => {
    const newName = taskNameTextarea.value;
    fetch(`/desk/task/name`, {
        method: 'PATCH',
        body: JSON.stringify({
            name: newName,
            listID: currentList,
            taskID: currentTask
        }),
        headers: {'Content-Type' : 'application/json; charset=UTF-8'}
    })
    .then(res => res.json())
    .then(newLists => {
        if(!newLists) return;
        deskData.lists = newLists;
        document.getElementById(currentTask).querySelector('.taskName').textContent = newName;
    });
});

// Update Task-Description
taskDescTextarea.addEventListener('change', () => {
    const newDesc = taskDescTextarea.value;
    fetch(`/desk/task/description`, {
        method: 'PATCH',
        body: JSON.stringify({
            desc: newDesc,
            listID: currentList,
            taskID: currentTask
        }),
        headers: {'Content-Type' : 'application/json; charset=UTF-8'}
    })
    .then(res => res.json())
    .then(newLists => {
        if(!newLists) return;
        deskData.lists = newLists;
    });
});

/**
 * #### Auto Set height of textare to content size
 * @param {HTML ELEMENT} textarea html textarea
 */
function autoSetTextareaHeight(textarea){
    textarea.style.height = "5px";
    textarea.style.height = (textarea.scrollHeight)+"px";
};

// DELETE SPECIFIC TASK
function deleteTask(listID, taskID){
    fetch(`/desk/task/${listID}/${taskID}`, {
        method: 'DELETE'
    })
    .then(res => res.json())
    .then(newLists => {
        if(!newLists) return;
        deskData.lists = newLists;
        document.getElementById(taskID).remove();
    });
};

// COLOR THEME
const theme = localStorage.getItem('task_deskDarkTheme');
const themeSwitch = document.querySelector('#darkModeSwitch');

theme ? applyDarkTheme() : applyLightTheme();

themeSwitch.addEventListener('click', () => {
    themeSwitch.checked ? applyDarkTheme() : applyLightTheme();
});

function applyDarkTheme(){
    localStorage.setItem('task_deskDarkTheme', true);
    document.body.setAttribute('data-theme', 'dark');
    themeSwitch.checked = true;
    themeSwitch.setAttribute('checked', true);
};
function applyLightTheme(){
    localStorage.removeItem('task_deskDarkTheme');
    document.body.setAttribute('data-theme', 'light');
};


// TASK SEARCHBAR
const searchbar = document.querySelector('#searchbar');
const searchBtn = document.querySelector('#clearSearch');
let searchReady = true;
searchbar.addEventListener('keydown', e => {
    if(e.key != 'Enter' || !searchReady) return;
    processSearchQuery();
});
searchBtn.addEventListener('click', () => {
    if(!searchReady) return;
    processSearchQuery();
});

function processSearchQuery(){
    const query = searchbar.value.toLowerCase();
    if(query == '') return;
    searchReady = false;
    const allTasks = Array.from(document.querySelectorAll('.task'));
    const found = allTasks.find( task => {
        if (task.innerText.toLowerCase().indexOf(query) > -1) {
            return task;
        };
    });
    if(found){
        markFoundTask(found);
    }
    else{
        markNotFound();
    }
};

// Mark task after Search
function markFoundTask(found){
    found.scrollIntoView({behavior:'smooth', block: 'center', inline: 'center'});
    found.scrollTop += 20;
    found.classList.toggle('task-found');
    setTimeout(() => {
        found.classList.toggle('task-found');
        searchReady = true;
    }, 1000);
};

// Mark Searchbar if not found
function markNotFound(){
    searchbar.classList.add('task-not-found');
    searchBtn.classList.add('task-not-found');
    setTimeout(() => {
        searchbar.classList.remove('task-not-found');
        searchBtn.classList.remove('task-not-found');
        searchReady = true;
    }, 1000);
};

// Desk Chat
const openChat = document.querySelector('#chatBtn');
const chatForm = document.querySelector('#chatForm');
const chatWindow = document.querySelector('#chatWindow');
const messages = document.querySelector('#messages');
const messageIndicator = document.querySelector('#messageIndicator');

// Sets up socket events after desk data load
function setupSocket(){
    const socket = io();

    socket.emit('join', { name: userData.name, room: location.pathname });

    socket.emit('chat-here', userData.name);

    socket.on('chat-receive', msgIn => {
        const {message, name} = msgIn;
        buildMessage(message, name);
    });

    socket.on('chat-otherHere', name => {
        const info = `${name} is online`;
        buildChatInfo(info, 'online');
    });

    socket.on('desk-leave', name => {
        const info = `${name} left`;
        buildChatInfo(info, 'leave');
    });

    // Clear Default Chat Messages
    messages.innerHTML = '';
    chatForm.querySelector('button').removeAttribute('disabled');
    chatForm.querySelector('input').removeAttribute('disabled');
    // Chat Form - Send Msg event
    chatForm.addEventListener('submit', e => {
        e.preventDefault();
        if(chatForm.message.value.trim().length == 0){
            chatForm.reset();
            return;
        };
        const message = chatForm.message.value.trim();
        const msgOut = { message: message, name: userData.name };
        socket.emit('chat-send', msgOut);
        buildMessage(message);
        chatForm.reset();
    });
};

openChat.addEventListener('click', () => {
    chatWindow.classList.toggle('d-none');
    chatForm.reset();
    chatForm.querySelector('input').focus();
    scrollWindow.scrollTop = scrollWindow.scrollHeight;
    messageIndicator.classList.add('d-none');
});

// Build Chat-Message List Element
const scrollWindow = document.querySelector('#messageWindow');
let lastMessageBy;

function buildMessage(msg, identifier = 'You'){
    const {alignment, color} = identifier == 'You' ? {alignment: 'left', color: '#777'} : {alignment: 'right', color: 'coral'};
    const msgHead = lastMessageBy == identifier ? '' : `<small style="color:${color}">${identifier}</small>`;

    lastMessageBy = identifier;
    messages.innerHTML += `<li class="msg-align-${alignment}">${msgHead}<div>${msg}</div></li>`;
    scrollWindow.scrollTop = scrollWindow.scrollHeight;

    if(chatWindow.classList.contains('d-none')){
        messageIndicator.classList.remove('d-none');
    };
};

// Build Chat-Info List Element
function buildChatInfo(msg, type){
    lastMessageBy = undefined;
    const statusColor = type == 'online' ? 'limegreen' : 'rgba(220, 20, 60, 0.699)';
    messages.innerHTML += `<li class="chat-info"><div style="background-color: ${statusColor};"></div><span>${msg}</span></li>`;
    scrollWindow.scrollTop = scrollWindow.scrollHeight;
};