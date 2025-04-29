import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import React from "react";
import { themeColor, useTheme } from "react-native-rapi-ui";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const { isDarkmode, theme } = useTheme();

  return (
    <Tabs
      initialRouteName="meetings"
      screenOptions={{
        tabBarActiveTintColor: themeColor.primary,
        tabBarInactiveTintColor: isDarkmode
          ? themeColor.dark200
          : themeColor.gray,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: isDarkmode ? themeColor.dark200 : themeColor.gray200,
          backgroundColor: isDarkmode ? themeColor.dark : themeColor.white,
          height: 60,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        headerStyle: {
          backgroundColor: isDarkmode ? themeColor.dark : themeColor.white,
          shadowColor: isDarkmode ? "#000000" : "#f0f0f0",
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 3,
          borderBottomWidth: 1,
          borderBottomColor: isDarkmode
            ? themeColor.dark200
            : themeColor.gray200,
        },
        headerTitleStyle: {
          color: isDarkmode ? themeColor.white : themeColor.black,
          fontWeight: "bold",
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="meetings"
        options={{
          title: "모임",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="calendar" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="players"
        options={{
          title: "플레이어",
          tabBarIcon: ({ color }) => <TabBarIcon name="users" color={color} />,
        }}
      />
      <Tabs.Screen
        name="grounds"
        options={{
          title: "족구장",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="map-marker" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
