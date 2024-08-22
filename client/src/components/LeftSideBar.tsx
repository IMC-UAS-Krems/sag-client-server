import { createSignal, onMount } from "solid-js";
import { Menu, Item, useContextMenu, animation, Submenu } from "solid-contextmenu";
import Swal from "sweetalert2";
import "../../../node_modules/solid-contextmenu/dist/style.css";
import { eden } from "@client/api";
import { file } from "bun";

/*
{
      body: t.Object({
        name: t.String(),
        projectName: t.String(),
        organizationName: t.String(),
        municipalityName: t.String(),
        path: t.String(),
        documentType: t.Union([t.Literal("file"), t.Literal("folder")]),
      }),
      beforeHandle: authMiddleware,
      detail: { tags: ["api"], description: "Create a new document" },
    },
*/

interface File {
  name: string;
  isExpanded: boolean;
  content?: string;
  files?: File[];
  isSelected?: boolean;
  //
  municipalityName: string;
  orgName: string;
  projectName: string;
  documentType: "file" | "folder";
  documentPath: string;
}

/*interface newFile {
  municipalityName: string;
  orgName: string;
  projectName: string;
  documentType: string;
  documentPath: string;
}*/

const MENU_ID = "menu-id";

interface LeftSideBarProps {
  onFileClick: (content: string | undefined) => void;
  code: string;
}

export function LeftSideBar(props: LeftSideBarProps) {
  const [files, setFiles] = createSignal<File[]>([]);
  const [_animation, setAnimation] = createSignal(animation.scale);
  const [_theme, setTheme] = createSignal<"light" | "dark">("light");
  const { show } = useContextMenu({ id: MENU_ID });

  let rightClickedFileOrFolder: File | null = null;
  let leftClickedFileOrFolder: File | null = null;

  const fetchFiles = async (): Promise<File[]> => {
    let filesFetched = await eden.api.documents.get(
      {
        $fetch: {
          mode: "cors",
          credentials: "include",
          method: "GET",
        },
      },
    );
    return filesFetched.data as File[];
  }

  const addSingleFileOrFolder = async (file: File) => {
    let addedFileOrFolder = await eden.api.document.post(
      {
        $fetch: {
          mode: "cors",
          credentials: "include",
          method: "POST",
        },
        name: file.name,
        path: file.documentPath,
        projectName: file.projectName,
        organizationName: file.orgName,
        municipalityName: file.municipalityName,
        documentType: file.documentType,
      });
    }
      
  const updateFiles = async (files: File[]) => {
    let updatedFiles = await eden.api.documents.get(
      {
        $fetch: {
          mode: "cors",
          credentials: "include",
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
        $query: {
          files: JSON.stringify(files),
        },
      },
    );
    return updatedFiles.data as File[];
  }
  /*const updateFiles = async (files: File[]): Promise<File[]> => {
    let updatedFiles = await eden.api.documents.post(
      {
        documents: files,
        $fetch: {
          mode: "cors",
          credentials: "include",
          method: "POST",
        },
      });
    return updatedFiles.data as File[];
  }*/

  onMount(async () => {
    const initialFiles = await fetchFiles();
    if (!Array.isArray(initialFiles)) {
      return;
    }
    let folderNames = Array.from(
      new Set(
        initialFiles
          .filter((file) => file.documentPath && file.documentPath.includes('.'))
          .map((file) => file.documentPath!.split('.')[0])
      )
    );
    
    folderNames.forEach((folderName) => {
      let folder = initialFiles.find((file) => file.documentPath === folderName);
      if (folder) {
        folder.files = initialFiles.filter((file) => file.documentPath && file.documentPath.startsWith(folderName + '.'));
      }
    });

    initialFiles.forEach((file, index) => {
      if (file.documentPath && file.documentPath.includes('.')) {
        initialFiles.splice(index, 1);
      }
    });

    setFiles(initialFiles);
    initialFiles.forEach((file) => {
      if (file.files) {
        file.files.forEach((subfile) => {
          if (subfile.isSelected && subfile.content !== undefined) {
            props.onFileClick(subfile.content);
          }
        });
      } else {
        if (file.isSelected && file.content !== undefined) {
          props.onFileClick(file.content);
        }
      }
    });
  });

  async function setFilesAndUpdate(files: File[]) {
    setFiles(files);
    try {
      await updateFiles(files);
    } catch (error) {
      console.error("Failed to update files:", error);
    }
  }

  function toggleExpand(file: File) {
    setFiles((currentFiles) => {
      const updateFileAndNested = (currentFile: File): File => {
        if (currentFile === file) {
          return { ...currentFile, isExpanded: !currentFile.isExpanded };
        }
        if (currentFile.files && currentFile.files.includes(file)) {
          return {
            ...currentFile,
            files: currentFile.files.map((subfile) =>
              subfile === file ? { ...subfile, isExpanded: !subfile.isExpanded } : subfile,
            ),
          };
        }
        if (currentFile.files) {
          return {
            ...currentFile,
            files: currentFile.files.map(updateFileAndNested),
          };
        }
        return currentFile;
      };

      const updatedFiles = currentFiles.map(updateFileAndNested);
      setFilesAndUpdate(updatedFiles);
      return updatedFiles;
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
      console.log("Selected file content: ", file.content);
      props.onFileClick(file.content);
    } else {
      props.onFileClick(undefined);
    }
    setFilesIsSelectedToFalse(files());
    leftClickedFileOrFolder = file;
    rightClickedFileOrFolder = null;
    leftClickedFileOrFolder.isSelected = true;
    setFilesAndUpdate([...files()]);
  }

  function handleContextMenu(event: MouseEvent, file: File | null) {
    event.preventDefault();
    show(event);
    if (file === null) {
      console.log("Right-clicked on empty space");
      rightClickedFileOrFolder = null;
      leftClickedFileOrFolder = null;
    } else {
      console.log(`Right-clicked on ${file.documentPath}`);
      setFilesIsSelectedToFalse(files());
      rightClickedFileOrFolder = file;
      rightClickedFileOrFolder.isSelected = true;
      leftClickedFileOrFolder = null;
      setFilesAndUpdate([...files()]);
    }
  }

  function handleMenuClick(action: string) {
    console.log("Clicked action:", action);
    if (action === "Rename" && rightClickedFileOrFolder === null) {
      Swal.fire("Error", "Please right-click on a file or folder in order to rename it.", "error");
      return;
    } else if (action === "Add folder" && rightClickedFileOrFolder === null) {
      const newFolderName = prompt("Enter new folder name:");
      if (newFolderName?.length == 0) {
        Swal.fire("Error", "Name cannot be empty.", "error");
        return;
      }
      const existingFolder = findFileRecursive(files(), newFolderName || "");
      if (existingFolder) {
        Swal.fire("Error", `Name ${newFolderName} already exists.`, "error");
        return;
      }
      if (newFolderName !== null) {
        const updatedFiles = [...files(), { name: newFolderName, isExpanded: false, files: [] }];
        addSingleFileOrFolder({
          name: newFolderName, documentPath: newFolderName, documentType: 'folder',
          isExpanded: false,
          municipalityName: "",
          orgName: "",
          projectName: ""
        });
        setFilesAndUpdate(updatedFiles as File[]);
      }
    } else if (action === "Add file" && rightClickedFileOrFolder === null) {
      const newFileName = prompt("Enter new file name:");
      if (newFileName?.length == 0) {
        Swal.fire("Error", "Name cannot be empty.", "error");
        return;
      }
      const existingFile = findFileRecursive(files(), newFileName || "");
      if (existingFile) {
        Swal.fire("Error", `Name ${newFileName} already exists.`, "error");
        return;
      }
      if (newFileName !== null) {
        const updatedFiles = [
          ...files(),
          {
            name: newFileName,
            isExpanded: false,
            content: "",
            isSelected: false,
          },
        ];
        setFilesAndUpdate(updatedFiles as File[]);
      }
    } else if (action === "Save" && rightClickedFileOrFolder === null) {
      Swal.fire("Error", "Please right-click on a file in order to save its content.", "error");
      return;
    } else if (action === "Delete" && rightClickedFileOrFolder === null) {
      Swal.fire("Error", "Please right-click on a file or folder in order to delete it.", "error");
      return;
    }

    if (action === "Rename" && rightClickedFileOrFolder) {
      const newName = prompt(
        `Enter new name for ${rightClickedFileOrFolder.files ? "folder" : "file"} <${rightClickedFileOrFolder.documentPath}>:`,
      );
      if (newName?.length == 0) {
        Swal.fire("Error", "Name cannot be empty.", "error");
        return;
      }
      const existingFileOrFolder = findFileRecursive(files(), newName || "");
      if (existingFileOrFolder) {
        Swal.fire("Error", `Name ${newName} already exists.`, "error");
        return;
      }
      if (newName !== null) {
        rightClickedFileOrFolder.documentPath = newName;
        setFilesAndUpdate([...files()]);
      }
    } else if (action === "Add folder" && rightClickedFileOrFolder) {
      const newFolderName = prompt("Enter new folder name:");
      if (newFolderName?.length == 0) {
        Swal.fire("Error", "Name cannot be empty.", "error");
        return;
      }
      const existingFolder = findFileRecursive(files(), newFolderName || "");
      if (existingFolder) {
        Swal.fire("Error", `Name ${newFolderName} already exists.`, "error");
        return;
      }
      if (newFolderName !== null) {
        rightClickedFileOrFolder.files = rightClickedFileOrFolder.files || [];
        rightClickedFileOrFolder.files.push({
          name: newFolderName,
          isExpanded: false,
          files: [],
          municipalityName: "",
          orgName: "",
          projectName: "",
          documentType: "folder",
          documentPath: ""
        });
        setFilesAndUpdate([...files()]);
      }
    } else if (action === "Add file" && rightClickedFileOrFolder) {
      const newFileName = prompt("Enter new file name:");
      if (newFileName?.length == 0) {
        Swal.fire("Error", "Name cannot be empty.", "error");
        return;
      }
      const existingFile = findFileRecursive(files(), newFileName || "");
      if (existingFile) {
        Swal.fire("Error", `Name ${newFileName} already exists.`, "error");
        return;
      }
      if (newFileName !== null) {
        rightClickedFileOrFolder.files = rightClickedFileOrFolder.files || [];
        rightClickedFileOrFolder.files.push({
          name: newFileName,
          isExpanded: false,
          content: "",
          isSelected: false,
          municipalityName: "",
          orgName: "",
          projectName: "",
          documentType: "file",
          documentPath: ""
        });
        setFilesAndUpdate([...files()]);
      }
    } else if (action === "Save" && rightClickedFileOrFolder) {
      if (!rightClickedFileOrFolder.isSelected) {
        if (!rightClickedFileOrFolder?.content) {
          Swal.fire("Error", "Please right-click on a file in order to save its content.", "error");
          return;
        } else if (!rightClickedFileOrFolder.isSelected) {
          Swal.fire("Error", "The file needs to be selected in order to save its content.", "error");
          return;
        }
      }
      rightClickedFileOrFolder.content = props.code;
      Swal.fire(
        "Success",
        `The content of file ${rightClickedFileOrFolder.documentPath} has been successfully saved.`,
        "success",
      );
    } else if (action === "Delete" && rightClickedFileOrFolder) {
      if (rightClickedFileOrFolder.files) {
        setFiles((currentFiles) => {
          const deleteFolderAndNested = (currentFile: File): File | null => {
            if (currentFile === rightClickedFileOrFolder) {
              return null;
            }
            if (currentFile.files) {
              return {
                ...currentFile,
                files: currentFile.files.map(deleteFolderAndNested).filter((file) => file !== null) as File[],
              };
            }
            return currentFile;
          };

          const updatedFiles = currentFiles.map(deleteFolderAndNested).filter((file) => file !== null) as File[];
          setFilesAndUpdate(updatedFiles);
          return updatedFiles;
        });
      } else if (rightClickedFileOrFolder.content !== undefined) {
        console.log("Deleted file content: ", rightClickedFileOrFolder.content);
        setFiles((currentFiles) => {
          const deleteFile = (currentFile: File): File | null => {
            if (currentFile === rightClickedFileOrFolder) {
              return null;
            }
            return {
              ...currentFile,
              files: currentFile.files?.map(deleteFile).filter((file) => file !== null) as File[],
            };
          };

          const updatedFiles = currentFiles.map(deleteFile).filter((file) => file !== null) as File[];
          setFilesAndUpdate(updatedFiles);
          return updatedFiles;
        });
      }
      console.log(files());
    }
  }

  function renderFiles(files: File[]) {
    return (
      <ul style={{ "list-style": "none", "padding-left": "20px" }}>
        {files.map((file) => (
          <li>
            <div style={{ display: "flex", "align-items": "center" }}>
              <span style={{ cursor: "default" }}>{file.documentType === 'folder' ? '📁' : '📄'}</span>
              <span
                onClick={() => {
                  handleClick(file);
                  toggleExpand(file);
                }}
                style={{
                  cursor: "pointer",
                  "font-weight": file.isSelected ? "bold" : "normal",
                }}
              >
                {file.documentPath}
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
      if (file.documentPath === clickedName) {
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
    <div
      class="left-column"
      style={{ overflow: "auto" }}
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
        <Item onClick={() => handleMenuClick("Rename")}>✏️ Rename</Item>
        <Item onClick={() => handleMenuClick("Save")}>💾 Save</Item>
        <Item onClick={() => handleMenuClick("Delete")}>🗑️ Delete</Item>
        <Submenu label="➕ Add">
          <Item onClick={() => handleMenuClick("Add folder")}>📁 Folder</Item>
          <Item onClick={() => handleMenuClick("Add file")}>📄 File</Item>
        </Submenu>
      </Menu>
    </div>
  );
}