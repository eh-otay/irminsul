const main = document.querySelector('#main');

let filePath = '';

let tree;

let treePath = [];

document.addEventListener('readystatechange', () => {
  if (document.readyState === 'complete') {
    newFile();
    addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey)
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
  content.querySelectorAll('a').forEach((elem)=>{
    elem.addEventListener('click', async (event)=>{
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

  async function editEvt () {
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

    async function no () {
      branchElem.remove();
      drawBranch(x, y, branch, branchPath);
    }
    noBtn.addEventListener('click', no);

    const yesBtn = document.createElement('input');
    yesBtn.setAttribute('class', 'yes');
    yesBtn.type = 'button';
    yesBtn.value = 'Save';
    btns.appendChild(yesBtn);

    async function yes () {
      branch.value = content.innerText;

      branchElem.remove();
      drawBranch(x, y, branch, branchPath);
    }
    yesBtn.addEventListener('click', yes);

    async function keysEdit (event) {
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

  async function deleteEvt () {
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

    async function no () {
      branchElem.remove();
      drawBranch(x, y, branch, branchPath);
    }
    noBtn.addEventListener('click', no);

    const yesBtn = document.createElement('input');
    yesBtn.setAttribute('class', 'yes');
    yesBtn.type = 'button';
    yesBtn.value = 'Yes';
    btns.appendChild(yesBtn);

    async function yes () {
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
        drawTree(treePath, tree);
      }
    }
    yesBtn.addEventListener('click', yes);

    async function keysDelete (event) {
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

  async function addEvt () {
    treePath = branchPath;
    branch.children.push({
      'type': 'text',
      'value': 'Notes...',
      'children': []
    });
    drawTree(treePath, tree);
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

  for (const i in currentBranch.children) {
    const x = Math.cos(2 * Math.PI * i / n) * r1;
    const y = Math.sin(2 * Math.PI * i / n) * r2;
    const path = Object.create(treePath);
    path.push(i);
    const branch = await drawBranch(WIDTH / 2 + x, HEIGHT / 2 + y, currentBranch.children[i], path);
    branch.querySelector('.content').addEventListener('click', () => {
      treePath.push(i);
      drawTree(treePath, tree);
    });
  }
}

async function openFile() {
  const { status, err, path, content } = await ElectronAPI.open();
  if (status !== 'success') {
    return;
  }
  filePath = path;
  tree = JSON.parse(content);
  treePath = [];
  drawTree(treePath, tree);
  ElectronAPI.setTitle('Irminsul | ' + path);
}
document.querySelector('#open-file').addEventListener('click', openFile);

async function newFile() {
  filePath = '';
  treePath = [];
  tree = {
    'value': '# TITLE',
    'children': []
  };
  drawTree(treePath, tree);
  ElectronAPI.setTitle('Irminsul | New file');
}
document.querySelector('#new-file').addEventListener('click', newFile);

async function saveAsFile() {
  const { status, err, path, content } = await ElectronAPI.saveAs(JSON.stringify(tree));
  if (status !== 'success') {
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
  if (status !== 'success') {
  }
}
document.querySelector('#save-file').addEventListener('click', saveFile);

async function reloadEditor() {
  drawTree(treePath, tree);
}
document.querySelector('#reload-file').addEventListener('click', reloadEditor);