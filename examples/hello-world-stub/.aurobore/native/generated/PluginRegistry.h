#ifndef AUROBORE_PLUGIN_REGISTRY_H
#define AUROBORE_PLUGIN_REGISTRY_H

#include "PluginDescriptor.h"
#include "IPlugin.h"

#include <QList>

class BridgeRouter;

IPlugin *createEchoPlugin(BridgeRouter *router);
IPlugin *createDevicePlugin(BridgeRouter *router);
IPlugin *createStoragePlugin(BridgeRouter *router);

class PluginRegistry
{
public:
    static QList<PluginDescriptor> descriptors();
    static IPlugin *createPlugin(const QString &display, BridgeRouter *router);
};

#endif
