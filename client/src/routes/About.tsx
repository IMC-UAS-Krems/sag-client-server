import { Component } from "solid-js";
import { Button } from "@client/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@client/components/ui/card.tsx";

import Header from "@client/components/Header.tsx";

const t = (s: string) => s;

const About: Component = () => {
  return (
    <Header>
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card Content</p>
        </CardContent>
        <CardFooter>
          <p>Card Footer</p>
        </CardFooter>
      </Card>
      <h1 class="text-3xl font-bold underline text-rose-500"> Hello world! </h1>
      <Button variant="destructive">Button</Button>
      <main>{`${t("About")} ${t("page")}`}</main>
    </Header>
  );
};

export default About;
