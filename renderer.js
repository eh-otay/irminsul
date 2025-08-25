const main = document.querySelector('#main');
const treePathElem = document.querySelector('#tree-path');

let filePath = '';

let tree;

let treePath = [];

let editing = false;

document.addEventListener('readystatechange', () => {
  if (document.readyState === 'complete') {
    newFile();
    addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey)
        event.preventDefault();
      if (event.altKey)
        event.preventDefault();
    });
    addEventListener('keyup', (event) => {
      if (event.key === 'Enter' && !event.shiftKey)
        event.preventDefault();
    });
  }
});

async function drawBranch(x, y, branch, branchPath) {
  const branchElem = document.createElement('div');
  branchElem.setAttribute('class', 'branch statusnormal');

  const content = document.createElement('div');
  content.setAttribute('class', 'text content');
  content.innerHTML = await ElectronAPI.parseMD(branch.value);
  content.querySelectorAll('a').forEach((elem) => {
    elem.addEventListener('click', async (event) => {
      event.preventDefault();
      await ElectronAPI.openLink(elem.href);
    });
  });
  branchElem.appendChild(content);

  const btns = document.createElement('div');
  btns.setAttribute('class', 'tools');

  const editBtn = document.createElement('input');
  editBtn.setAttribute('class', 'edit');
  editBtn.type = 'button';
  editBtn.value = 'Edit';
  btns.appendChild(editBtn);

  async function editEvt() {
    editing = true;

    branchElem.setAttribute('class', 'branch statusedit');
    content.setAttribute('class', 'content textedit');
    content.setAttribute('contenteditable', 'plaintext-only');
    content.innerHTML = branch.value;

    const selection = getSelection();
    const range = document.createRange();
    range.selectNodeContents(content);
    selection.removeAllRanges();
    selection.addRange(range);

    btns.setAttribute('class', 'prompts');
    btns.innerHTML = '';

    const noBtn = document.createElement('input');
    noBtn.setAttribute('class', 'no');
    noBtn.type = 'button';
    noBtn.value = 'Cancel';
    btns.appendChild(noBtn);

    async function no() {
      editing = false;

      branchElem.remove();
      drawBranch(x, y, branch, branchPath);
    }
    noBtn.addEventListener('click', no);

    const yesBtn = document.createElement('input');
    yesBtn.setAttribute('class', 'yes');
    yesBtn.type = 'button';
    yesBtn.value = 'Save';
    btns.appendChild(yesBtn);

    async function yes() {
      editing = false;

      branch.value = content.innerText;

      branchElem.remove();
      drawBranch(x, y, branch, branchPath);
    }
    yesBtn.addEventListener('click', yes);

    async function keysEdit(event) {
      if (!branchElem.matches(':hover'))
        return;

      if (event.key === 'Enter' && !event.shiftKey) {
        yes();
        branchElem.removeEventListener('keydown', keysEdit);
      }

      if (event.key === 'Escape') {
        no();
        branchElem.removeEventListener('keydown', keysEdit);
      }
    }
    addEventListener('keydown', keysEdit);
  }
  editBtn.addEventListener('click', editEvt);

  const deleteBtn = document.createElement('input');
  deleteBtn.setAttribute('class', 'delete');
  deleteBtn.type = 'button';
  deleteBtn.value = 'Delete';
  btns.appendChild(deleteBtn);

  async function deleteEvt() {
    branchElem.setAttribute('class', 'branch statusdelete');
    content.setAttribute('class', 'content prompt');
    content.innerHTML = 'Are you sure?';

    btns.setAttribute('class', 'prompts');
    btns.innerHTML = '';

    const noBtn = document.createElement('input');
    noBtn.setAttribute('class', 'no');
    noBtn.type = 'button';
    noBtn.value = 'No';
    btns.appendChild(noBtn);

    async function no() {
      branchElem.remove();
      drawBranch(x, y, branch, branchPath);
    }
    noBtn.addEventListener('click', no);

    const yesBtn = document.createElement('input');
    yesBtn.setAttribute('class', 'yes');
    yesBtn.type = 'button';
    yesBtn.value = 'Yes';
    btns.appendChild(yesBtn);

    async function yes() {
      let parentBranch = tree;
      let i = 0;
      for (; i < branchPath.length - 1; i++) {
        parentBranch = parentBranch.children[branchPath[i]];
      }
      parentBranch.children.splice(branchPath[i], 1);

      if (branchPath.length !== treePath.length) {
        drawTree(treePath, tree);
      } else {
        treePath.pop();
        updateTreePath(treePath);
        drawTree(treePath, tree);
      }
    }
    yesBtn.addEventListener('click', yes);

    async function keysDelete(event) {
      if (!branchElem.matches(':hover'))
        return;

      if (event.key === 'Enter') {
        yes();
        branchElem.removeEventListener('keydown', keysDelete);
      }

      if (event.key === 'Escape') {
        no();
        branchElem.removeEventListener('keydown', keysDelete);
      }
    }
    addEventListener('keydown', keysDelete);
  }
  deleteBtn.addEventListener('click', deleteEvt);

  const addBtn = document.createElement('input');
  addBtn.setAttribute('class', 'add');
  addBtn.type = 'button';
  addBtn.value = 'Add';
  btns.appendChild(addBtn);

  async function addEvt() {
    branch.children.push({
      'value': 'Notes...',
      'children': []
    });
    updateTreePath(branchPath);
  }
  addBtn.addEventListener('click', addEvt);

  addEventListener('keydown', async (event) => {
    if (!branchElem.matches(':hover'))
      return;

    if (btns.getAttribute('class') !== 'tools')
      return;

    if (event.key === 'Enter')
      editEvt();

    if (event.key === 'Backspace')
      deleteEvt();

    if (event.key === '=')
      addEvt();
  });

  branchElem.appendChild(btns);

  branchElem.style.left = `${x}px`;
  branchElem.style.top = `${y}px`;
  main.appendChild(branchElem);
  return branchElem;
}

async function drawTree(treePath, tree) {
  const WIDTH = main.clientWidth;
  const HEIGHT = main.clientHeight;

  main.innerHTML = '';
  let currentBranch = tree;
  for (const path of treePath) {
    currentBranch = currentBranch.children[path];
  }
  drawBranch(WIDTH / 2, HEIGHT / 2, currentBranch, treePath);

  const n = currentBranch.children.length;
  const r1 = WIDTH / 3;
  const r2 = HEIGHT / 3;

  function a (i) {
    return () => {
      treePath.push(i);
      updateTreePath(treePath);
    };
  }
  for (const i in currentBranch.children) {
    const x = Math.cos(2 * Math.PI * i / n) * r1;
    const y = Math.sin(2 * Math.PI * i / n) * r2;
    const path = Object.create(treePath);
    path.push(i);
    const branch = await drawBranch(WIDTH / 2 + x, HEIGHT / 2 + y, currentBranch.children[i], path);
    branch.querySelector('.content').addEventListener('click', a(i));
  }
}

function updateTreePath(newTreePath) {
  treePath = newTreePath;

  function a(i) {
    return () => {
      updateTreePath(treePath.slice(0, i));
    };
  }

  treePathElem.innerHTML = '';
  let currentBranch = tree;
  let i = 0;
  for (const path of treePath) {
    const pathElem = document.createElement('p');
    pathElem.setAttribute('class', 'parent');
    pathElem.innerHTML = currentBranch.value.substring(0, 10);
    treePathElem.append(pathElem);

    pathElem.addEventListener('click', a(i));

    i++;
    currentBranch = currentBranch.children[path];
  }
  const pathElem = document.createElement('p');
  pathElem.innerHTML = currentBranch.value.substring(0, 10);
  treePathElem.append(pathElem);

  drawTree(treePath, tree);
}

document.addEventListener('keydown', async (event) => {
  if(!editing) {
    if (event.key === '[') {
      if (treePath.length > 0) {
        treePath.pop();
        updateTreePath(treePath);
      }
    }
  }
})

document.addEventListener('drop', async (event) => {
  event.preventDefault();
  event.stopPropagation();

  let currentBranch = tree;
  for (const path of treePath) {
    currentBranch = currentBranch.children[path];
  }

  for (const file of event.dataTransfer.files) {
    const p = file.name.toLowerCase();
    if (!(p.endsWith('.jpeg') || p.endsWith('.jpg') || p.endsWith('.png'))) {
      alert('unable to upload this format');
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', async (event) => {
      currentBranch.children.push({
        'value': `![${file.name}](${event.target.result})`,
        'children': []
      });
      await drawTree(treePath, tree);
    });
    reader.readAsDataURL(file);
  }
});

document.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
});

async function openFile() {
  const { status, err, path, content } = await ElectronAPI.open();
  if (status === 'error') {
    alert(`Failed to open: ${err}`);
    return;
  }
  filePath = path;
  tree = JSON.parse(content);
  updateTreePath([]);
  ElectronAPI.setTitle('Irminsul | ' + path);
}
document.querySelector('#open-file').addEventListener('click', openFile);

async function newFile() {
  filePath = '';
  tree = {
    'value': '# IRMINSUL',
    'children': []
  };
  updateTreePath([]);
  ElectronAPI.setTitle('Irminsul | New file');
}
document.querySelector('#new-file').addEventListener('click', newFile);

async function saveAsFile() {
  const { status, err, path, content } = await ElectronAPI.saveAs(JSON.stringify(tree));
  if (status === 'error') {
    alert(`Failed to save: ${err}`);
    return;
  }
  filePath = path;
  ElectronAPI.setTitle('Irminsul | ' + path);
}
document.querySelector('#save-as-file').addEventListener('click', saveAsFile);

async function saveFile() {
  if (filePath === '') {
    return;
  }
  const { status, err, path, content } = await ElectronAPI.save(filePath, JSON.stringify(tree).toString());
  if (status === 'error') {
    alert(`Failed to save: ${err}`);
  }
}
document.querySelector('#save-file').addEventListener('click', saveFile);

async function reloadEditor() {
  drawTree(treePath, tree);
}
document.querySelector('#reload-file').addEventListener('click', reloadEditor);