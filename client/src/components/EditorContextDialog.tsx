import { createSignal, Component, createEffect } from "solid-js";
import { Accessor } from "solid-js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectErrorMessage,
} from "@client/components/ui/select.tsx";
import { TextField, TextFieldErrorMessage, TextFieldInput, TextFieldLabel } from "@client/components/ui/textField.tsx";
import { Button } from "@client/components/ui/button.tsx";
import { IoAlertCircle } from "solid-icons/io";
import { FaSolidCircleQuestion } from "solid-icons/fa";
import { TreeNode } from "@client/components/LeftSideBar.tsx";
import { MenuOption } from "@client/components/LeftSideBar.tsx";
import { SagDocumentType } from "@client/components/LeftSideBar.tsx";
import { showToast } from "@client/components/ui/toast.tsx";

interface EditorContextDialogProps {
  variant: "destructive" | "confirm";
  menuOption: MenuOption;
  buttonText: string;
  title: string;
  description: string;
  open: Accessor<boolean>;
  setOpen: (value: boolean) => void;
  node: TreeNode | null;
  modal?: boolean;
  navigateToFile?: (newNode: TreeNode) => void;
}

const EditorContextDialog: Component<EditorContextDialogProps> = (props) => {
  const [internalOpen, setInternalOpen] = createSignal(false);
  const dialogOpen = () => (props.open !== undefined ? props.open() : internalOpen());
  const setDialogOpen = (value: boolean) => {
    if (props.setOpen !== undefined) {
      props.setOpen(value);
    } else {
      setInternalOpen(value);
    }
  };

  const [name, setName] = createSignal<string>("");
  const [nameError, setNameError] = createSignal<string | null>(null);
  // Reset on open
  createEffect(() => {
    if (props.open()) {
      setName("");
      setNameError(null);
    }
  });

  // Add file from template specific logic
  interface Template {
    node: TreeNode; // Node
    path: string; // Path
    name: string; // Name
  }
  const [template, setTemplate] = createSignal<Template | null>(null); // The path of the selected template
  const [templates, setTemplates] = createSignal<Template[]>([]); // List of templates
  const [templatesError, setTemplatesError] = createSignal<string | null>(null);

  // General name validation logic
  const validateName = async () => {
    const isNew = [MenuOption.AddFile, MenuOption.AddFolder, MenuOption.AddFileFromTemplate].includes(props.menuOption);
    if (!name()) {
      setNameError(null);
    } else if (!name().match("^[a-zA-Z0-9_ ]+$")) {
      setNameError("Input must contain only letters, numbers, underscores and spaces");
    } else if (!(await props.node?.checkNewPath(name(), isNew))) {
      setNameError("A template with this name already exists");
    } else {
      setNameError(null);
    }
  };

  // Conditional on submit logic
  const submit = async () => {
    await validateName();
    if (nameError()) {
      return;
    }

    switch (props.menuOption) {
      case MenuOption.Rename:
        if (!props.node) {
          console.error("node is not defined");
          return;
        }
        await props.node?.renameDocument(name());
        setName("");
        break;
      case MenuOption.AddFile: {
        if (!props.navigateToFile || !props.node) {
          console.error("navigateToFile or node is not defined");
          return;
        }
        const newNode = await props.node?.createDocument(name(), SagDocumentType.FILE, props.node?.path() as string);
        if (newNode && newNode instanceof TreeNode) {
          props.navigateToFile(newNode);
          props.node?.setIsExpanded(true);
        }
        setName("");
        break;
      }
      case MenuOption.AddFolder: {
        if (!props.navigateToFile || !props.node) {
          console.error("navigateToFile or node is not defined");
          return;
        }
        const newNode = await props.node?.createDocument(name(), SagDocumentType.FOLDER, props.node?.path() as string);
        if (newNode && newNode instanceof TreeNode) {
          props.node?.setIsExpanded(true);
          props.navigateToFile(newNode);
        }
        setName("");
        break;
      }
      case MenuOption.AddFileFromTemplate: {
        if (!props.navigateToFile || !props.node || !template()) {
          console.error("props.navigateToFile, node or template is not defined");
          showToast({
            title: "Error",
            description: "Error when adding file from template, try again later",
            variant: "error",
          });
          return;
        }

        const selectedTemplate = template();
        const selectedTempalteNode = selectedTemplate?.node;

        if (!selectedTempalteNode) {
          // Add this check
          console.error("selectedTemplateNode is not defined");
          showToast({
            title: "Error",
            description: "Template node is missing, try again later.",
            variant: "error",
          });
          return;
        }

        const templateContent = await selectedTempalteNode.getContent();
        const newNode = (await props.node?.createDocument(
          name(),
          SagDocumentType.FILE,
          props.node?.path() as string,
          templateContent,
        )) as TreeNode;
        if (newNode && newNode instanceof TreeNode) {
          props.node?.setIsExpanded(true);
          props.navigateToFile(newNode);
        }
        break;
      }
    }
  };

  const getTemplatesForNode = (node: TreeNode) => {
    const orgNode = node?.getOrganisationNode();
    if (!orgNode) {
      console.error("Error finding the org node for the current node: ", node);
      showToast({
        title: "Error",
        description: "Error when looking for templates, organisation not found",
        variant: "error",
      });
      setTemplatesError("Error when looking for templates, organisation not found, try again later");
      return;
    }

    // Select the child node that has `docType` folder and `isTemplate` true
    const templateNode = orgNode?.children.find(
      (child) => child.docType === SagDocumentType.FOLDER && child.isTemplate,
    );

    // If no template folder is found for the organisation, show an error message
    if (!templateNode) {
      showToast({
        title: "Error",
        description: "No templates folder found for the organisation",
        variant: "error",
      });
      setTemplatesError("No templates folder found for the organisationm, try again later");
      return;
    }

    const getTemplates = (node: TreeNode, acc: Template[]): Template[] => {
      node.children.forEach((child) => {
        if (child.docType === SagDocumentType.FILE) {
          acc.push({ node: child, path: child.path() as string, name: child.name() as string });
        } else if (child.docType === SagDocumentType.FOLDER) {
          // Recursively call getTemplates for folder nodes
          getTemplates(child, acc);
        }
      });
      return acc;
    };
    const templates: Template[] = getTemplates(templateNode, []);

    if (templates.length === 0) {
      showToast({
        title: "Error",
        description: "No templates found for the organisation",
        variant: "error",
      });
      setTemplatesError("No templates found for the organisation, create one first");
      return;
    }

    const ensureUniqueTemplateNames = (templates: Template[]): Template[] => {
      const count: Record<string, number> = {};
      return templates.map((template) => {
        count[template.name] = (count[template.name] || 0) + 1;
        if (count[template.name] > 1) {
          return { ...template, name: `${template.name} (${template.path})` };
        }
        return template;
      });
    };

    setTemplates(ensureUniqueTemplateNames(templates));
  };

  createEffect(() => {
    if (props.open() && props.menuOption === MenuOption.AddFileFromTemplate) {
      setTemplate(null);
      setName("");
      setTemplatesError(null);
      if (props.node) {
        getTemplatesForNode(props.node);
      }
    }
  });

  return (
    <Dialog open={dialogOpen()} onOpenChange={setDialogOpen} modal={props.modal}>
      <DialogContent class={`max-w-lg ${props.variant === "destructive" ? "border-destructive" : ""}`}>
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            {props.variant === "destructive" ? (
              <IoAlertCircle class="text-destructive w-7 h-7" />
            ) : (
              <FaSolidCircleQuestion class="text-primary w-7 h-7" />
            )}
            {props.title}
          </DialogTitle>
          <DialogDescription class="mt-2">{props.description}</DialogDescription>
        </DialogHeader>
        <div class="space-y-6">
          {props.menuOption === MenuOption.AddFileFromTemplate && (
            <Select
              value={template() === null ? "" : template()?.name}
              onChange={(value) => {
                const template = templates().find((template) => template.name === value);
                if (template) {
                  setTemplate(template);
                } else {
                  setTemplate(null);
                }
              }}
              options={templates().map((template) => template.name)}
              placeholder={"Select a template…"}
              itemComponent={(props) => <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>}
              validationState={templatesError() ? "invalid" : "valid"}
              modal={true}
              disabled={templatesError() !== null}
            >
              <SelectLabel>Template</SelectLabel>
              <div class="mt-1">
                <SelectTrigger aria-label="Municipalities">
                  <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
                </SelectTrigger>
                <SelectContent />
                {templatesError() && <SelectErrorMessage>{templatesError()}</SelectErrorMessage>}
              </div>
            </Select>
          )}
          <TextField class="space-y-1" validationState={nameError() ? "invalid" : "valid"}>
            <TextFieldLabel>Name</TextFieldLabel>
            <TextFieldInput
              value={name()}
              placeholder="Enter the name here..."
              onInput={(e) => {
                setName(e.currentTarget.value);
                validateName();
              }}
            />
            {nameError() && <TextFieldErrorMessage>{nameError()}</TextFieldErrorMessage>}
          </TextField>
        </div>
        <DialogFooter>
          <Button
            disabled={Boolean(nameError()) || !name()}
            variant={props.variant === "destructive" ? "destructive" : "default"}
            onClick={() => {
              submit();
              setDialogOpen(false);
            }}
          >
            {props.buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditorContextDialog;
