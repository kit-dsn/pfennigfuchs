import MemberInviteVue from "@/components/MemberInvite.vue";
import { mount } from "@vue/test-utils";
import { BootstrapVue3 } from "bootstrap-vue-3";
import { createPinia, setActivePinia } from "pinia";
import { describe, it, expect } from "vitest";

const pinia = createPinia()
setActivePinia(pinia);
const memberInvite = mount(MemberInviteVue, {
    global: {
        plugins: [BootstrapVue3, pinia]
    },
    props: {
        roomId: null,
    }
});

describe("Member invite", () => {
    it("Testing empty username input", () => {
        //@ts-ignore
        expect(memberInvite.vm.tagState("")).toBeFalsy();
    });

    it("Testing false username input", () => {
        //@ts-ignore
        expect(memberInvite.vm.tagState("asdf")).toBeFalsy();
    });

    it("Testing false username input", () => {
        //@ts-ignore
        expect(memberInvite.vm.tagState("/%$")).toBeFalsy();
    });

    it("Testing false username input", () => {
        //@ts-ignore
        expect(memberInvite.vm.tagState("asdf:df.com")).toBeFalsy();
    });

    it("Testing false username input", () => {
        //@ts-ignore
        expect(memberInvite.vm.tagState("@asdf.com")).toBeFalsy();
    });

    it("Testing false username input", () => {
        //@ts-ignore
        expect(memberInvite.vm.tagState("@asdf:dfcom")).toBeFalsy();
    });

    it("Testing false username input", () => {
        //@ts-ignore
        expect(memberInvite.vm.tagState("@asdfdfcom")).toBeFalsy();
    });

    it("Testing false username input", () => {
        //@ts-ignore
        expect(memberInvite.vm.tagState("asdf:dfcom")).toBeFalsy();
    });

    it("Testing false username input", () => {
        //@ts-ignore
        expect(memberInvite.vm.tagState("asdfdf.com")).toBeFalsy();
    });

    it("Testing false username input", () => {
        //@ts-ignore
        expect(memberInvite.vm.tagState("@sdf:.com")).toBeFalsy();
    });

    it("Testing false username input", () => {
        //@ts-ignore
        expect(memberInvite.vm.tagState("@:.com")).toBeFalsy();
    });

    it("Testing false username input", () => {
        //@ts-ignore
        expect(memberInvite.vm.tagState("@:.")).toBeFalsy();
    });

    it("Testing correct username input", () => {
        //@ts-ignore
        expect(memberInvite.vm.tagState("@test:asdf.com")).toBeTruthy();
    });

    it("Testing correct username input", () => {
        //@ts-ignore
        expect(memberInvite.vm.tagState("@test:f.de")).toBeTruthy();
    });

    it("Testing correct username input", () => {
        //@ts-ignore
        expect(memberInvite.vm.tagState("@te_st:assd.uds")).toBeTruthy();
    });

    it("Adding new invitee", () => {
        //@ts-ignore
        memberInvite.vm.addInvitee("@hallo:test.com");
        //@ts-ignore
        expect(memberInvite.vm.invitees).toContain("@hallo:test.com");
    });

    it("Adding duplicate", () => {
        //@ts-ignore
        memberInvite.vm.addInvitee("@blub:test.com");
        //@ts-ignore
        memberInvite.vm.addInvitee("@blub:test.com");
        //@ts-ignore
        expect(memberInvite.vm.invitees.filter(user => user == "@blub:test.com").length).toBe(1);
    });
});