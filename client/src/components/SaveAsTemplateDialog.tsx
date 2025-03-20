import { createSignal, createEffect } from "solid-js";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@client/components/ui/dialog.tsx";
import { TextField, TextFieldErrorMessage, TextFieldInput, TextFieldLabel } from "@client/components/ui/textField.tsx";
import { showToast } from "@client/components/ui/toast.tsx";
import { Button } from "@client/components/ui/button.tsx";
import { eden } from "@client/api/index.ts";
import { TreeNode } from "@client/components/LeftSideBar.tsx";
import { TbLoader2 } from "solid-icons/tb";

enum SagDocumentType {
  FILE = "FILE",
  FOLDER = "FOLDER",
  MUNICIPALITY = "MUNICIPALITY",
  ORG = "ORG",
  PROJECT = "PROJECT",
}

interface SaveAsTemplateDialogProps {
  content: string;
  node: TreeNode;
  navigateToFile: (newNode: TreeNode) => void;
}

export default function SaveAsTemplateDialog(props: SaveAsTemplateDialogProps) {
  const [open, setOpen] = createSignal(false);
  const [name, setName] = createSignal<string>("");
  const [nameError, setNameError] = createSignal<string | null>(null);
  const [templates, setTemplates] = createSignal<string[]>([]);
  const [templateNode, setTemplateNode] = createSignal<TreeNode | undefined>(undefined);
  const [loading, setLoading] = createSignal(false);

  const validateName = () => {
    if (!name()) {
      setNameError(null);
    } else if (templates().includes(name().toLowerCase().replaceAll(" ", "-"))) {
      setNameError("A template with this name already exists");
    } else if (!name().match("^[a-zA-Z0-9_ ]+$")) {
      setNameError("Input must contain only letters, numbers, underscores and spaces");
    } else {
      setNameError(null);
    }
  };

  // On mount set details
  createEffect(() => {
    // Find the templateNode of the organisation
    const orgNode = props.node.getOrganisationNode();
    if (!orgNode) {
      console.error("No organisation folder found for the file");
      showToast({
        title: "Error",
        description: "No organisatio folder found for the file",
        variant: "error",
      });
      setOpen(false);
      return;
    }
    const templateNode = orgNode?.children.find(
      (child) => child.docType === SagDocumentType.FOLDER && child.isTemplate,
    );
    if (!templateNode) {
      console.error("No templates folder found for the organisation");
      showToast({
        title: "Error",
        description: "No templates folder found for the organisation",
        variant: "error",
      });
      setOpen(false);
      return;
    }
    setTemplateNode(templateNode);
    setTemplates(templateNode.children.map((child) => child.name().toLowerCase().replaceAll(" ", "-")));
  });

  // On submit
  const submit = async () => {
    validateName();
    if (nameError() || !name()) {
      return;
    }
    setLoading(true);
    try {
      const response = await eden.api["save-as-template"].post({
        organizationName: props.node.orgName as string,
        name: name(),
        content: props.content,
        $fetch: {
          mode: "cors",
          credentials: "include",
        },
      });
      if (response.status !== 201) {
        console.error("Error saving content as template");
        if (response.status === 409) {
          throw new Error("A template with this name already exists");
        } else {
          throw new Error("Failed to save content as template, try again later");
        }
      } else {
        showToast({
          title: "Success",
          description: "File saved as template",
          variant: "success",
        });
        // console.log("Response for creating the new node: ", response.data);
        const newNode = new TreeNode(
          {
            name: name(),
            docType: SagDocumentType.FILE,
            path: response.data as string,
            projectName: undefined, // There is no project name on purpose
            orgName: props.node.orgName,
            municipalityName: props.node.municipalityName,
            isExpanded: true,
            isTemplate: true,
            parent: templateNode(),
          },
          props.node.editorContext,
        );
        console.log("New node created:", newNode);
        templateNode()?.addChild(newNode);
        templateNode()?.toggleExpanded();
        props.navigateToFile(newNode);
        setOpen(false);
      }
    } catch (error) {
      console.error("Error creating new template:", error);

      let errorMessage = "An unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setOpen(false);
      showToast({
        variant: "error",
        title: "Error",
        description: errorMessage,
      });
      return;
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open()} onOpenChange={setOpen}>
      <DialogTrigger>Save as Template</DialogTrigger>
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>Name template</DialogTitle>
          <DialogDescription>
            You may name your new template here. It will be saved to the root of your organisation's templates folder.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <TextField class="space-y-1" validationState={nameError() ? "invalid" : "valid"}>
            <TextFieldLabel>Template Name</TextFieldLabel>
            <TextFieldInput
              value={name()}
              placeholder="Template name here..."
              onInput={(e) => {
                setName(e.currentTarget.value);
                validateName();
              }}
            />
            {nameError() && <TextFieldErrorMessage>{nameError()}</TextFieldErrorMessage>}
          </TextField>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={Boolean(nameError()) || !name() || loading()}>
            {loading() && <TbLoader2 class="animate-spin" />}
            Create Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
