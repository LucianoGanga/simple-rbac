# simple-rbac
Simple RBAC (Role-based access control) for mongoose apps

## Requirements
* [mongoose](https://github.com/learnboost/mongoose/)

## Also works with
* [Dust.js](https://github.com/linkedin/dustjs/)

## What is RBAC?
Role-based access control (RBAC) is a method of regulating access based on the roles of individual users within an enterprise/app. In this context, access is the ability of an individual user to perform a specific task, such as view, create, or modify information or get aditional tools in an application. Roles are defined according to job competency, authority, responsibility or any other established condition.

## Module description
simple-rbac gives you the base code to implement a RBAC with mongoose, allowing you to use it together with your own user's collection.

It's really simple to use and has tools to integrate it with a templating engine as Dust.js (more engines comming soon! :) ), in case you want to render your app based on the role-based access controll settings, and tools to make role-based decisions server-side.

## Installation

```
npm install simple-rbac --save
```

## Usage


