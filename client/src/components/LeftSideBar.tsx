import { createSignal } from 'solid-js';
import { Menu, Item, useContextMenu, animation, Submenu } from 'solid-contextmenu';
import Swal from 'sweetalert2';
import "../../../node_modules/solid-contextmenu/dist/style.css";
import { Button } from '@kobalte/core';

interface File {
  name: string;
  isExpanded: boolean;
  content?: string;
  files?: File[];
  isSelected?: boolean;
}

const MENU_ID = 'menu-id';

const initialFiles: File[] = [
  {
    name: 'Folder 1',
    isExpanded: false,
    files: [
      { name: 'File 1.1', isExpanded: false, content: 'Content of File 1.1', isSelected: false },
      { name: 'File 1.2', isExpanded: false, content: 'Content of File 1.2', isSelected: false },
    ],
  },
  {
    name: 'Folder 2',
    isExpanded: false,
    files: [
      { name: 'File 2.1', isExpanded: false, content: 'Content of File 2.1', isSelected: false },
      {
        name: 'Subfolder 2.2', isExpanded: false, files: [
          { name: 'File 2.2.1', isExpanded: false, content: 'Content of File 2.2.1', isSelected: false },
          { name: 'File 2.2.2', isExpanded: false, content: 'Content of File 2.2.2', isSelected: false },
        ]
      },
    ],
  },
];

interface LeftSideBarProps {
  onFileClick: (content: string | undefined) => void;
  code: string;
}

export function LeftSideBar(props: LeftSideBarProps) {
  const [files, setFiles] = createSignal(initialFiles);
  const [_animation, setAnimation] = createSignal(animation.scale);
  const [_theme, setTheme] = createSignal<"light" | "dark">("light");
  const { show } = useContextMenu({ id: MENU_ID });

  let rightClickedFileOrFolder: File | null = null;
  let leftClickedFileOrFolder: File | null = null;

  function toggleExpand(file: File) {
    setFiles((currentFiles) => {
      const updateFileAndNested = (currentFile: File): File => {
        if (currentFile === file) {
          return { ...currentFile, isExpanded: !currentFile.isExpanded };
        }
        if (currentFile.files && currentFile.files.includes(file)) {
          return {
            ...currentFile,
            files: currentFile.files.map((subfile) => (subfile === file ? { ...subfile, isExpanded: !subfile.isExpanded } : subfile))
          };
        }
        if (currentFile.files) {
          return {
            ...currentFile,
            files: currentFile.files.map(updateFileAndNested)
          };
        }
        return currentFile;
      };

      return currentFiles.map(updateFileAndNested);
    });
  }

  function setFilesIsSelectedToFalse(files: File[]) {
    files.forEach((file) => {
      file.isSelected = false;
      if (file.files) {
        setFilesIsSelectedToFalse(file.files);
      }
    });
  }

  function handleClick(file: File) {
    if (file.content !== undefined) {
      console.log('Selected file content: ', file.content);
      props.onFileClick(file.content);
    } else {
      props.onFileClick(undefined);
    }
    setFilesIsSelectedToFalse(files());
    leftClickedFileOrFolder = file;
    rightClickedFileOrFolder = null;
    leftClickedFileOrFolder.isSelected = true;
  }

  function handleContextMenu(event: MouseEvent, file: File | null) {
    event.preventDefault();
    show(event);
    if (file === null) {
      console.log('Right-clicked on empty space');
      rightClickedFileOrFolder = null;
      leftClickedFileOrFolder = null;
    } else {
      console.log(`Right-clicked on ${file.name}`);
      setFilesIsSelectedToFalse(files());
      rightClickedFileOrFolder = file;
      rightClickedFileOrFolder.isSelected = true;
      leftClickedFileOrFolder = null;
      setFiles([...files()]);
    }
  }

  function handleMenuClick(action: string) {
    console.log('Clicked action:', action);
    if (action === 'Rename' && rightClickedFileOrFolder === null) {
      Swal.fire('Error', 'Please right-click on a file or folder in order to rename it.', 'error');
      return;
    } else if (action === 'Add folder' && rightClickedFileOrFolder === null) {
      const newFolderName = prompt('Enter new folder name:');
      if (newFolderName?.length == 0) {
        Swal.fire('Error', 'Name cannot be empty.', 'error');
        return;
      }
      const existingFolder = findFileRecursive(files(), newFolderName || '');
      if (existingFolder) {
        Swal.fire('Error', `Name ${newFolderName} already exists.`, 'error');
        return;
      }
      if (newFolderName !== null) {
        setFiles([...files(), { name: newFolderName, isExpanded: false, files: [] }]);
      }
    } else if (action === 'Add file' && rightClickedFileOrFolder === null) {
      const newFileName = prompt('Enter new file name:');
      if (newFileName?.length == 0) {
        Swal.fire('Error', 'Name cannot be empty.', 'error');
        return;
      }
      const existingFile = findFileRecursive(files(), newFileName || '');
      if (existingFile) {
        Swal.fire('Error', `Name ${newFileName} already exists.`, 'error');
        return;
      }
      if (newFileName !== null) {
        setFiles([...files(), { name: newFileName, isExpanded: false, content: '', isSelected: false }]);
      }
    } else if (action === 'Save' && rightClickedFileOrFolder === null) {
      Swal.fire('Error', 'Please right-click on a file in order to save its content.', 'error');
      return;
    } else if (action === 'Delete' && rightClickedFileOrFolder === null) {
      Swal.fire('Error', 'Please right-click on a file or folder in order to delete it.', 'error');
      return;
    }

    if (action === 'Rename' && rightClickedFileOrFolder) {
      const newName = prompt(`Enter new name for ${rightClickedFileOrFolder.files ? 'folder' : 'file'} <${rightClickedFileOrFolder.name}>:`);
      if (newName?.length == 0) {
        Swal.fire('Error', 'Name cannot be empty.', 'error');
        return;
      }
      const existingFileOrFolder = findFileRecursive(files(), newName || '');
      if (existingFileOrFolder) {
        Swal.fire('Error', `Name ${newName} already exists.`, 'error');
        return;
      }
      if (newName !== null) {
        rightClickedFileOrFolder.name = newName;
        setFiles([...files()]);
      }
    } else if (action === 'Add folder' && rightClickedFileOrFolder) {
      const newFolderName = prompt('Enter new folder name:');
      if (newFolderName?.length == 0) {
        Swal.fire('Error', 'Name cannot be empty.', 'error');
        return;
      }
      const existingFolder = findFileRecursive(files(), newFolderName || '');
      if (existingFolder) {
        Swal.fire('Error', `Name ${newFolderName} already exists.`, 'error');
        return;
      }
      if (newFolderName !== null) {
        rightClickedFileOrFolder.files = rightClickedFileOrFolder.files || [];
        rightClickedFileOrFolder.files.push({ name: newFolderName, isExpanded: false, files: [] });
        setFiles([...files()]);
      }
    } else if (action === 'Add file' && rightClickedFileOrFolder) {
      const newFileName = prompt('Enter new file name:');
      if (newFileName?.length == 0) {
        Swal.fire('Error', 'Name cannot be empty.', 'error');
        return;
      }
      const existingFile = findFileRecursive(files(), newFileName || '');
      if (existingFile) {
        Swal.fire('Error', `Name ${newFileName} already exists.`, 'error');
        return;
      }
      if (newFileName !== null) {
        rightClickedFileOrFolder.files = rightClickedFileOrFolder.files || [];
        rightClickedFileOrFolder.files.push({ name: newFileName, isExpanded: false, content: '', isSelected: false });
        setFiles([...files()]);
      }
    } else if (action === 'Save' && rightClickedFileOrFolder) {
      if (!rightClickedFileOrFolder.isSelected) {
        if (!rightClickedFileOrFolder?.content) {
          Swal.fire('Error', 'Please right-click on a file in order to save its content.', 'error');
          return;
        } else if (!rightClickedFileOrFolder.isSelected) {
          Swal.fire('Error', 'The file needs to be selected in order to save its content.', 'error');
          return;
        }
      }
      rightClickedFileOrFolder.content = props.code;
      Swal.fire('Success', `The content of file ${rightClickedFileOrFolder.name} has been successfully saved.`, 'success');
    } else if (action === 'Delete' && rightClickedFileOrFolder) {
      if (rightClickedFileOrFolder.files) {
        setFiles((currentFiles) => {
          const deleteFolderAndNested = (currentFile: File): File | null => {
            if (currentFile === rightClickedFileOrFolder) {
              return null;
            }
            if (currentFile.files) {
              return {
                ...currentFile,
                files: currentFile.files.map(deleteFolderAndNested).filter((file) => file !== null) as File[]
              };
            }
            return currentFile;
          };

          return currentFiles.map(deleteFolderAndNested).filter((file) => file !== null) as File[];
        });
      } else if (rightClickedFileOrFolder.content !== undefined) {
        console.log('Deleted file content: ', rightClickedFileOrFolder.content);
        setFiles((currentFiles) => {
          const deleteFile = (currentFile: File): File | null => {
            if (currentFile === rightClickedFileOrFolder) {
              return null;
            }
            return {
              ...currentFile,
              files: currentFile.files?.map(deleteFile).filter((file) => file !== null) as File[]
            }
          };

          return currentFiles.map(deleteFile).filter((file) => file !== null) as File[];
        });
      }
      console.log(files());
    }
  }

  function renderFiles(files: File[]) {
    return (
      <ul style={{ "list-style": 'none', "padding-left": '20px' }}>
        {
          files.map((file) => (
            <li>
              <div style={{ display: 'flex', "align-items": 'center' }}>
                <span style={{ cursor: 'default' }}>
                  {file.files ? (file.isExpanded ? '📂' : '📁') : '📄'}
                </span>
                <span
                  onClick={() => {
                    handleClick(file); toggleExpand(file);
                  }} style={{ cursor: 'pointer', "font-weight": file.isSelected ? 'bold' : 'normal' }}>
                  {file.name}
                </span>
              </div>
              {file.isExpanded && file.files && renderFiles(file.files)}
            </li>
          ))}
      </ul>
    );
  }

  function findFileRecursive(files: File[], clickedName: string): File | null {
    for (const file of files) {
      if (file.name === clickedName) {
        return file;
      }
      if (file.files) {
        const foundFile = findFileRecursive(file.files, clickedName);
        if (foundFile) {
          return foundFile;
        }
      }
    }
    return null;
  }

  return (
    <div class="left-column" style={{ overflow: 'auto' }}
      onContextMenu={(event) => {
        const target = event.target as HTMLElement;
        if (target.innerText) {
          const rightClickedElement = findFileRecursive(files(), target.innerText);
          if (rightClickedElement) {
            handleContextMenu(event, rightClickedElement);
          } else {
            handleContextMenu(event, null);
          }
        } else {
          handleContextMenu(event, null);
        }
      }}
    >
      {renderFiles(files())}
      <Menu id={MENU_ID} animation={_animation()} theme={_theme()}>
        <Item onClick={() => handleMenuClick('Rename')}>✏️ Rename</Item>
        <Item onClick={() => handleMenuClick('Save')}>💾 Save</Item>
        <Item onClick={() => handleMenuClick('Delete')}>🗑️ Delete</Item>
        <Submenu label="➕ Add">
          <Item onClick={() => handleMenuClick('Add folder')}>📁 Folder</Item>
          <Item onClick={() => handleMenuClick('Add file')}>📄 File</Item>
        </Submenu>
      </Menu>
    </div>
  );
}